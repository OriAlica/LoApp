import { useBorrowStore } from '@/store/borrowStore';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type Item = {
  itemID: string;
  statusAvailability: number;
  [key: string]: any;
};

type userInType = {
  user_ID: string;
  user_name: string;
};

export type ScannedItem = { id: string; name: string };

export default function BorrowPage() {
  const isFocused = useIsFocused();
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [userIn, setUserIn] = useState<userInType>();
  const [note, setNote] = useState('');
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const isProcessingRef = useRef(false);
  // const BASE_URL = Platform.select({
  //   ios: 'https://cu.wingscorp.com/los',
  //   android: 'https://cu.wingscorp.com/los',
  // });

  const BASE_URL = 'https://cu.wingscorp.com/los';

  const endpoint1 = `${BASE_URL}/read-item-list`;
  const endpoint2 = `${BASE_URL}/update-item`;

  const resetScanCooldown = () => {
    setTimeout(() => {
      isProcessingRef.current = false;
    }, 1500); // throttle for 1.5 seconds
  };

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await fetch(endpoint1);
        const data = await response.json();

        const headers = data[0];
        const rows = data.slice(1);

        const parsedItems = rows.map((row: any[]) => {
          const item: any = {};
          headers.forEach((header: string, index: number) => {
            item[header] = row[index] ?? '';
          });

          // item.itemID = parseInt(item.itemID);
          item.statusAvailability = parseInt(item.statusAvailability);
          return item;
        });

        setItems(parsedItems);
        // console.log(parsedItems)
      } catch (error) {
        console.error('Failed to fetch items:', error);
      } finally {
        setLoading(false);
      }
    };

    const checkUser = async () => {
      const userInID = await AsyncStorage.getItem('empID');
      const userInName = await AsyncStorage.getItem('empName');
      
      setUserIn({ user_ID: userInID ?? '', user_name: userInName ?? '' });
      console.log(userIn)
    };

    checkUser();
    fetchItems();
    resetScanCooldown();
  }, []);

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  const toggleCameraFacing = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  

  const handleQRCodeScan = (scannedItemID: string) => {
    const now = Date.now();

    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const foundItem = items.find(item => item.itemID === scannedItemID);

    if (!foundItem) {
      Alert.alert('Item Not Found', `No item matches ID: ${scannedItemID}`);
      resetScanCooldown();
      return;
    }

    if (foundItem.statusAvailability === 0) {
      Alert.alert('Unavailable', `${foundItem.itemName} is already borrowed.`);
      resetScanCooldown();
      return;
    }

    const alreadyScanned = scannedItems.find(item => item.id === scannedItemID);
    if (alreadyScanned) {
      Alert.alert('Already Scanned', `${foundItem.itemName} has already been scanned.`);
      resetScanCooldown();
      return;
    }

    const newItem: ScannedItem = {
      id: foundItem.itemID,
      name: foundItem.itemName ?? 'Item',
    };

    setScannedItems(prev => [...prev, newItem]);
    resetScanCooldown(); // <-- Important
  };

  




  // const mockScanItem = () => {
  //   if (items.length === 0) {
  //     Alert.alert('Loading', 'Item list is still loading...');
  //     return;
  //   }

  //   const availableItems = items.filter(item => item.statusAvailability !== 0);

  //   if (availableItems.length === 0) {
  //     Alert.alert('Unavailable', 'No items available to borrow.');
  //     return;
  //   }

  //   const randomItem = availableItems[Math.floor(Math.random() * availableItems.length)];
  //   const scannedItem = {
  //     id: randomItem.itemID,
  //     name: randomItem.itemName ?? 'Item',
  //   };


  //   if (scannedItems.find(item => item.id === scannedItem.id)) {
  //     Alert.alert('Already Scanned', `${scannedItem.name} has already been scanned.`);
  //     return;
  //   }

  //   setScannedItems(prev => [...prev, scannedItem]);
  // };



  const removeItem = (id: string) => {
    setScannedItems((prev) => prev.filter((i) => i.id !== id));
  };


  const handleCancel = () => {
    setScannedItems([]);
  };

  const handlePinjem = async () => {
    if (scannedItems.length === 0) {
      alert('No items scanned!');
      return;
    }

    setLoading(true); // 👈 Block UI during processing

    const borrowedTime = new Date().toISOString();
    const successful: string[] = [];
    const failed: string[] = [];

    for (const item of scannedItems) {
      try {
        const res = await fetch(endpoint2, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemID: item.id,
            statusAvailability: 0,
            borrowedTime,
            by: userIn?.user_ID ?? '',
            note: note.trim(),
          }),
        });

        if (res.ok) {
          successful.push(item.id);
        } else {
          failed.push(item.id);
          console.log(`❌ Failed to update item ${item.id}`);
          break; // stop further updates
        }
      } catch (err) {
        console.log(`❌ Error updating item ${item.id}`, err);
        failed.push(item.id);
        break;
      }
    }

    // ⚠️ Rollback any successful updates if something failed
    if (failed.length > 0 && successful.length > 0) {
      for (const itemID of successful) {
        await fetch(endpoint2, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemID,
            statusAvailability: 1, // revert to available
            borrowedTime: '', // reset if needed
            by: '',
            note: '',
          }),
        });
        console.log(`🔄 Rolled back item ${itemID}`);
      }

      Alert.alert(
        'Borrow Failed',
        `Failed to update item(s): ${failed.join(', ')}. All changes have been reverted.`
      );

      setLoading(false);
      return;
    }

    // ✅ All good, save locally
    useBorrowStore.getState().addSlot({
      items: scannedItems,
      note: note.trim(),
      userId: userIn?.user_ID ?? '',
    });

    useBorrowStore.getState().setSelectedSlotId(null);
    setScannedItems([]);
    router.push('/return');
    setLoading(false);
  };



  return (
    <View style={styles.container}>
      <CameraView
        key={String(isFocused)}
        style={styles.camera}
        facing={facing}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={isScanning ? undefined : ({ data }) => handleQRCodeScan(data)}
      >
        <View style={styles.cameraControls}>
          <TouchableOpacity style={styles.controlButton} onPress={toggleCameraFacing}>
            <MaterialIcons 
              name={Platform.OS === 'ios' ? 'flip-camera-ios' : 'flip-camera-android'} 
              size={28} 
              color="white" 
            />
          </TouchableOpacity>
          {/* <TouchableOpacity style={styles.controlButton} onPress={mockScanItem} disabled={loading}>
            <Text style={styles.controlText}>{loading ? 'Loading...' : 'Scan'}</Text>
          </TouchableOpacity> */}
        </View>
        <View style={styles.logoutButton}>
          <Button
            title="Logout"
            onPress={async () => {
              await AsyncStorage.removeItem('isLoggedIn');
              router.replace('/login');
            }}
          />
        </View>
      </CameraView>

      <ScrollView style={styles.tagList} contentContainerStyle={styles.tagContent}>
        {scannedItems.map((item, index) => (
          <View key={index} style={styles.tag}>
            <Text style={styles.tagText}>{item.name}</Text>
            <TouchableOpacity onPress={() => removeItem(item.id)}>
              <Text style={styles.removeText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.noteButton} onPress={() => setNoteModalVisible(true)}>
          <MaterialIcons name="note-add" size={20} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            loading && { backgroundColor: '#6c757d' },
          ]}
          disabled={loading}
          onPress={handlePinjem}
        >
          <Text style={styles.actionText}>
            {loading ? 'Borrowing...' : 'Borrow'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={handleCancel}>
          <Text style={styles.actionText}>Remove</Text>
        </TouchableOpacity>
      </View>


      {noteModalVisible && (
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalOverlay}
          onPress={() => setNoteModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>Add Notes</Text>
            <TextInput
              placeholder="Write your note here..."
              multiline
              numberOfLines={4}
              value={note}
              onChangeText={setNote}
              style={styles.textInput}
            />
            <View style={{ flexDirection: 'row', marginTop: 10, justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={() => setNoteModalVisible(false)} style={styles.modalButton}>
                <Text style={{ color: 'white' }}>Done</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  message: { textAlign: 'center', margin: 10 },
  camera: Platform.select({
    ios: {
      height: 630,
      width: '100%',
    },
    android: {
      flex: 3,
    },
  }) || {},



  noteButton: {
    backgroundColor: '#ffc107',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },

  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
  },

  textInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    textAlignVertical: 'top',
    minHeight: 80,
  },

  modalButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 10,
  },

  cameraControls: {
    position: 'absolute',
    bottom: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 30,
    width: '100%',
  },
  controlButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 20,
  },
  controlText: { color: 'white', fontWeight: 'bold' },
  tagList: {
    maxHeight: 150,
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 10,
  },
  logoutButton: {
    position: 'absolute',
    top: 70, // you can tweak this for safe area
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    overflow: 'hidden',
  },

  tagContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  tag: {
    flexDirection: 'row',
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    margin: 4,
    alignItems: 'center',
  },
  tagText: { marginRight: 8 },
  removeText: { color: '#a75454ff', fontWeight: 'bold' },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: '#ccc',
  },
  actionButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  cancelButton: {
    backgroundColor: '#dc3545',
  },
  actionText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
