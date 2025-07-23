import { ScannedItem } from '@/app/(tabs)/index';
import { useBorrowStore } from '@/store/borrowStore';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

export default function ReturnPage() {
  const {
    slots,
    returnItems,
    selectedSlotId,
    setSelectedSlotId
  } = useBorrowStore();

  const [selectedItems, setSelectedItems] = useState<ScannedItem[]>([]);
  const [note, setNote] = useState('');
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [userIn, setUserIn] = useState<{ user_ID: string; user_name: string }>();
  const [loading, setLoading] = useState(false);

  // const BASE_URL = Platform.select({
  //   ios: 'https://cu.wingscorp.com/los',
  //   android: 'https://cu.wingscorp.com/los',
  // });
  const BASE_URL = 'https://cu.wingscorp.com/los';


  const endpoint = `${BASE_URL}/return-item`;

  const handleToggleItem = (item: ScannedItem) => {
    setSelectedItems((prev) => {
      const isSelected = prev.find((i) => i.id === item.id);
      return isSelected
        ? prev.filter((i) => i.id !== item.id)
        : [...prev, item];
    });
  };

  useEffect(() => {
    const checkUser = async () => {
      const userInID = await AsyncStorage.getItem('empID');
      const userInName = await AsyncStorage.getItem('empName');
      setUserIn({ user_ID: userInID ?? '', user_name: userInName ?? '' });
    };
    checkUser();
  }, []);

  


  const handleReturn = async () => {
    if (!selectedSlotId || loading) return;
    setLoading(true);

    const now = new Date().toISOString();

    try {
      await Promise.all(
        selectedItems.map(async (item) => {
          await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              itemID: item.id,
              statusAvailability: 1,
              returnedTime: now,
              returnedBy: userIn?.user_ID ?? '',
              note: note.trim(),
            }),
          });
        })
      );

      returnItems(selectedSlotId, selectedItems);
      setSelectedSlotId(null);
      setSelectedItems([]);
      setNote('');
    } catch (error) {
      console.error('❌ Return failed', error);
    }

    setLoading(false);
  };

  const renderModal = () => {
    if (!noteModalVisible) return null;

    return (
      <TouchableOpacity
        activeOpacity={1}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
        onPress={() => setNoteModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 20,
            width: '90%',
          }}
        >
          <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>Return Notes</Text>
          <TextInput
            placeholder="Write your return note..."
            multiline
            numberOfLines={4}
            value={note}
            onChangeText={setNote}
            style={{
              borderWidth: 1,
              borderColor: '#ccc',
              borderRadius: 8,
              padding: 10,
              textAlignVertical: 'top',
              minHeight: 80,
            }}
          />
          <View style={{ flexDirection: 'row', marginTop: 10, justifyContent: 'flex-end' }}>
            <TouchableOpacity
              onPress={() => setNoteModalVisible(false)}
              style={{
                backgroundColor: '#28a745',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: 'white' }}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (selectedSlotId) {
    const slot = slots.find((s) => s.id === selectedSlotId);
    if (!slot) return null;

    const availableItems = slot.items.filter((item) => !slot.returned.includes(item));
    const allSelected = availableItems.every((item) =>
      selectedItems.find((s) => s.id === item.id)
    );

    const toggleSelectAll = () => {
      setSelectedItems(allSelected ? [] : availableItems);
    };

    return (
      <View style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ padding: 16, paddingTop: 50 }}>
            <TouchableOpacity
              onPress={() => {
                setSelectedSlotId(null);
                setSelectedItems([]);
              }}
              style={{
                backgroundColor: '#ddd',
                padding: 10,
                borderRadius: 8,
                marginBottom: 12,
                alignSelf: 'flex-start',
              }}
            >
              <Text style={{ color: '#333' }}>← Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={toggleSelectAll}
              style={{
                backgroundColor: '#ffc107',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
                marginBottom: 10,
                alignSelf: 'flex-start',
              }}
            >
              <Text style={{ color: '#000', fontSize: 14 }}>
                {allSelected ? 'Unselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>

            <Text style={{ color: '#666', fontSize: 13, marginBottom: 4 }}>
              Returned {slot.returned.length}/{slot.items.length}
            </Text>

            {availableItems.map((item) => {
              const isSelected = selectedItems.some((i) => i.id === item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => handleToggleItem(item)}
                  style={{
                    padding: 12,
                    marginVertical: 6,
                    borderRadius: 8,
                    backgroundColor: isSelected ? '#d1e7dd' : '#f8f9fa',
                    borderColor: isSelected ? '#0f5132' : '#ced4da',
                    borderWidth: 1,
                  }}
                >
                  <Text style={{ color: isSelected ? '#0f5132' : '#212529' }}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {note.trim().length > 0 && (
              <View
                style={{
                  backgroundColor: '#fff3cd',
                  borderColor: '#ffeeba',
                  borderWidth: 1,
                  borderRadius: 8,
                  padding: 10,
                  marginBottom: 12,
                }}
              >
                <Text style={{ color: '#856404' }}>📝 Note: {note.trim()}</Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', marginTop: 12, gap: 10 }}>
              <TouchableOpacity
                style={{
                  backgroundColor: '#ffc107',
                  paddingVertical: 12,
                  borderRadius: 8,
                  flex: 3,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onPress={() => setNoteModalVisible(true)}
              >
                <MaterialIcons name="note-add" size={20} color="#000" />
              </TouchableOpacity>

              <TouchableOpacity
                disabled={loading}
                style={{
                  backgroundColor: loading ? '#6c757d' : '#007bff',
                  paddingVertical: 12,
                  borderRadius: 8,
                  flex: 7,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onPress={handleReturn}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>
                  {loading ? 'Returning...' : 'Return Selected'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>

        {renderModal()}
      </View>
    );
  }

  const userSlots = slots.filter((slot) => slot.userId === userIn?.user_ID);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 50 }}>
        {userSlots.some((slot) => slot.returned.length < slot.items.length) ? (
          <View
            style={{
              backgroundColor: '#e9ecef',
              padding: 12,
              borderRadius: 10,
              marginBottom: 16,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#212529' }}>
              📋 Log that needs to be returned
            </Text>
          </View>
        ) : (
          <View
            style={{
              backgroundColor: '#d4edda',
              padding: 12,
              borderRadius: 10,
              marginBottom: 16,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 16, color: '#155724', fontWeight: '500' }}>
              ✅ Nothing needs to be returned
            </Text>
          </View>
        )}

        {userSlots.map((slot) => {
          const allReturned = slot.returned.length === slot.items.length;
          return (
            <TouchableOpacity
                key={slot.id}
                onPress={() => {
                    if (slot.userId === userIn?.user_ID) {
                        setSelectedSlotId(slot.id);
                        setSelectedItems(slot.items.filter((i) => !slot.returned.includes(i)));
                    }
                }}

              style={{
                padding: 16,
                marginVertical: 8,
                backgroundColor: allReturned ? '#d4edda' : '#baecf3ff',
                borderRadius: 10,
              }}
            >
              <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>
                {slot.items.map((item) => item.name).join(', ')}
              </Text>
              <Text style={{ color: '#666', fontSize: 13 }}>
                Returned {slot.returned.length}/{slot.items.length}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {renderModal()}
    </SafeAreaView>
  );
}
