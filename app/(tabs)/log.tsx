import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
type HistoryItem = {
  logID: string;
  itemID: string;
  status: 'borrow' | 'return' | string;
  time: string;
  by?: string;
  notes?: string;
  key: string;
};


const ItemLogPage = () => {
  const colorScheme = useColorScheme();
  const [activeTab, setActiveTab] = useState<'availability' | 'history'>('availability');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'borrowed'>('all');
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [selectedUser, setSelectedUser] = useState<'all' | string>('all');
  const [showUnreturned, setShowUnreturned] = useState(false);
  // const BASE_URL = Platform.select({
  //   ios: 'https://cu.wingscorp.com/los',
  //   android: 'https://cu.wingscorp.com/los',
  // });

  const BASE_URL = 'https://cu.wingscorp.com/los';


  const endpoint1 = `${BASE_URL}/read-users`;
  const endpoint2 = `${BASE_URL}/read-item-list`;
  const endpoint3 = `${BASE_URL}/read-history`;

  const fetchUsers = async () => {
    try {
      const response = await fetch(endpoint1);
      const data = await response.json();

      const headers = data[0];
      const rows = data.slice(1);

      const map: Record<string, string> = {};
      rows.forEach((row: any[]) => {
      const entry: any = {};
      headers.forEach((header: string, index: number) => {
          entry[header] = row[index];
      });

      map[entry["emp_ID"]] = entry["emp_name"];
      });

      setUserMap(map);
    } catch (err) {
      console.error('Failed to fetch user names', err);
    }
  };


  const fetchItems = async () => {
    try {
      const response = await fetch(endpoint2);
      const data = await response.json();

      const headers = data[0];
      const rows = data.slice(1);

      const parsedItems = rows.map((row: any[]) => {
      const item: any = {};
      headers.forEach((header: string, index: number) => {
          item[header] = row[index] ?? '';
      });

      // item.itemID = item.itemID;
      item.statusAvailability = parseInt(item.statusAvailability);

      return item;
      });

      setItems(parsedItems);
    } catch (error) {
      console.error('Failed to fetch items:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch(endpoint3);
      const data = await response.json();

      const headers = data[0];
      const rows = data.slice(1);

      const parsed: HistoryItem[] = rows.map((row: any[]) => {
        const entry: any = {};
        headers.forEach((header: string, index: number) => {
          entry[header] = row[index] ?? '';
        });

        // Normalize field names
        return {
          logID: entry["logID"],
          itemID: entry["itemID"],
          status: entry["status (borrow/return)"],
          time: entry["time"],
          by: entry["by"],
          notes: entry["notes"],
          key: `${entry["logID"]}-${entry["itemID"]}-${entry["status (borrow/return)"]}`,
        };
      });

      // Sort descending by time
      setHistoryItems(
        parsed.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      );
    } catch (error) {
        console.error('Failed to fetch history:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      // When the screen is focused, refresh the history (and optionally items)
      fetchUsers();   
      fetchHistory();
      fetchItems(); // optional, if you want to ensure availability list is also updated
    }, [])
  );

  const availabilityList = items.map((item) => ({
    key: item.itemID.toString(),
    name: item.itemName,
    status: item.statusAvailability === 1 ? 'Available' : 'Borrowed',
    by:
      item.statusAvailability === 0 && item.borrowedBy
        ? userMap[item.borrowedBy] || item.borrowedBy
        : null,
  }));

  const enrichedHistoryItems = historyItems.map((history) => {
    const matchedItem = items.find(item => String(item.itemID) === String(history.itemID));
    const userName = userMap[history.by] || history.by || 'Unknown';

    return {
      ...history,
      itemName: matchedItem ? matchedItem.itemName : `#${history.itemID}`,
      userName,
    };
  });

  const unreturnedItems = items.filter(
    item =>
      item.statusAvailability === 0 && // status 0 = borrowed
      item.borrowedBy === selectedUser
  );

  const filteredAvailabilityList = availabilityFilter === 'all'
    ? availabilityList
    : availabilityList.filter(item =>
      availabilityFilter === 'available'
      ? item.status === 'Available'
      : item.status === 'Borrowed'
    );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors[colorScheme ?? 'light'].background }}>
      <View style={{ padding: 16, paddingTop: 50, flex: 1 }}>
        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'availability' && styles.tabButtonActive]}
            onPress={() => setActiveTab('availability')}
          >
            <Text style={[styles.tabText, activeTab === 'availability' && styles.tabTextActive]}>
              Item Availability
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'history' && styles.tabButtonActive]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
              History Log
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'availability' && (
          <View style={{ padding: 16 }}>
            <View style={styles.filterContainer}>
              {['all', 'available', 'borrowed'].map((filterOption) => (
                <TouchableOpacity
                  key={filterOption}
                  style={[
                    styles.filterButton,
                    availabilityFilter === filterOption && styles.filterButtonActive,
                  ]}
                  onPress={() => setAvailabilityFilter(filterOption as any)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      availabilityFilter === filterOption && styles.filterTextActive,
                    ]}
                  >
                    {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Loading */}
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} />
        ) : activeTab === 'availability' ? (
          <FlatList
            data={filteredAvailabilityList}
            keyExtractor={(item) => item.key}
            renderItem={({ item }) => (
              <View style={styles.availabilityCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.availabilityName}>{item.name}</Text>
                  {item.status === 'Borrowed' && item.by && (
                    <Text style={{ color: '#888', fontSize: 13, marginTop: 4 }}>
                      By: <Text style={{ fontWeight: '600' }}>{item.by}</Text>
                    </Text>
                  )}
                </View>
                <View
                  style={[
                    styles.availabilityBadge,
                    {
                      backgroundColor: item.status === 'Available' ? '#d4edda' : '#f8d7da',
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: item.status === 'Available' ? '#155724' : '#721c24',
                      fontWeight: '700',
                    }}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>
            )}
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchItems();
            }}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        ) : (
          <View style={{ padding: 16 }}>
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 6, color: Colors[colorScheme ?? 'light'].text }}>Filter by User:</Text>
              {Platform.OS === 'ios' ? (
                <View
                  style={{
                    height: 110, // Raise the center selection on iOS
                    overflow: 'hidden',
                    backgroundColor: '#f1f1f1',
                    borderRadius: 8,
                    borderColor: '#ccc',
                    borderWidth: 1,
                  }}
                >
                  <Picker
                    selectedValue={selectedUser}
                    onValueChange={(itemValue) => setSelectedUser(itemValue)}
                    style={{ marginTop: -70 }} // Shift picker up visually on iOS
                    itemStyle={{ color: 'black' }} 
                  >
                    <Picker.Item label="All Users" value="all" />
                    {Object.entries(userMap).map(([empId, name]) => (
                      <Picker.Item key={empId} label={name} value={empId} />
                    ))}
                  </Picker>
                </View>
              ) : (
                <>
                  <View
                    style={{
                      borderRadius: 8,
                      overflow: 'hidden',
                      backgroundColor: '#f1f1f1',
                      borderColor: '#ccc',
                      borderWidth: 1,
                    }}
                  >
                    <Picker
                      selectedValue={selectedUser}
                      onValueChange={(itemValue) => setSelectedUser(itemValue)}
                      style={{ height: 50 }}
                    >
                      <Picker.Item label="All Users" value="all" />
                      {Object.entries(userMap).map(([empId, name]) => (
                        <Picker.Item key={empId} label={name} value={empId} />
                      ))}
                    </Picker>
                  </View>

                  {selectedUser !== 'all' && (
                    <TouchableOpacity
                      onPress={() => setShowUnreturned(prev => !prev)}
                      style={{
                        marginTop: 15,
                        backgroundColor: '#007AFF',
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        borderRadius: 50,
                        alignSelf: 'flex-start',
                      }}
                    >
                      <Text style={{ color: 'white', fontWeight: '500', fontSize: 13 }}>
                        {showUnreturned ? 'Back to all logs' : 'Show Unreturned Items'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>

            {selectedUser !== 'all' && showUnreturned ? (
              <View style={{ marginLeft: 10 }}>
                {unreturnedItems.length === 0 && selectedUser !== 'all' ? (
                  <Text style={{ color: '#555' }}>No unreturned items for this user.</Text>
                ) : (
                  unreturnedItems.map(item => (
                    <View key={item.itemID} style={styles.availabilityCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.availabilityName}>{item.itemName}</Text>
                      </View>
                      <View
                        style={[
                          styles.availabilityBadge,
                          {
                            backgroundColor: item.statusAvailability === 1 ? '#d4edda' : '#f8d7da',
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: item.statusAvailability === 1 ? '#155724' : '#721c24',
                            fontWeight: '700',
                          }}
                        >
                          {item.statusAvailability === 1 ? 'Available' : 'BORROWED'}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            ) : (
              <FlatList
                data={
                  selectedUser === 'all'
                    ? enrichedHistoryItems
                    : enrichedHistoryItems.filter(item => item.by === selectedUser)
                }
                keyExtractor={(item) => item.key}
                renderItem={({ item }) => (
                  <View style={styles.logCard}>
                    <View style={styles.logHeader}>
                      <Text style={styles.logUser}>{item.userName}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: item.status === 'borrow' ? '#f8d7da' : '#d4edda' },
                        ]}
                      >
                        <Text style={{ color: item.status === 'borrow' ? '#721c24' : '#155724', fontWeight: '600' }}>
                          {item.status.toUpperCase()}ED
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.logMainText}>
                      <Text style={{ fontWeight: 'bold' }}>{item.itemName}</Text> at{' '}
                      {new Date(item.time).toLocaleString()}
                    </Text>
                    {item.notes ? <Text style={styles.logNotes}>Note: {item.notes}</Text> : null}
                  </View>
                )}
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchItems();
                  fetchHistory();
                }}
                contentContainerStyle={{ paddingBottom: 130 }}
              />
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default ItemLogPage;

const styles = StyleSheet.create({
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#eee',
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
  },
  tabTextActive: {
    color: 'white',
  },

  // New filter styles
  filterContainer: {
    backgroundColor: 'lightgrey',
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    marginBottom: 12,
    justifyContent: 'center',
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: '#eee',
    borderRadius: 20,
    marginHorizontal: 6,
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    fontWeight: '600',
    color: '#555',
  },
  filterTextActive: {
    color: 'white',
  },
  availabilityCard: {
    backgroundColor: 'white',
    padding: 14,
    borderRadius: 10,
    marginBottom: 7,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Android shadow
    elevation: 3,
  },
  availabilityName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flexShrink: 1,
  },
  availabilityBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },

  logRow: {
    marginBottom: 10,
  },
  logText: {
    fontSize: 15,
  },
  logCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Android shadow
    elevation: 3,
  },

  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    alignItems: 'center',
  },

  logUser: {
    fontWeight: '700',
    fontSize: 16,
    color: '#333',
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },

  logMainText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },

  logNotes: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#666',
    marginTop: 4,
  },

});
