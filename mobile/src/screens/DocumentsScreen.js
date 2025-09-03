import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ApiService from '../services/ApiService';

const DocumentsScreen = ({navigation, route}) => {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(route.params?.showSearch || false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async (reset = true) => {
    try {
      if (reset) {
        setIsLoading(true);
        setPage(1);
      }

      const currentPage = reset ? 1 : page;
      const response = await ApiService.getDocuments(currentPage, 20);
      
      if (reset) {
        setDocuments(response.documents);
      } else {
        setDocuments(prev => [...prev, ...response.documents]);
      }
      
      setHasMore(currentPage < response.total_pages);
      
    } catch (error) {
      Alert.alert('Error', 'Failed to load documents');
      console.error('Load documents error:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  };

  const loadMoreDocuments = async () => {
    if (hasMore && !isLoadingMore) {
      setIsLoadingMore(true);
      setPage(prev => prev + 1);
      await loadDocuments(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadDocuments(true);
  }, []);

  const searchDocuments = async (query) => {
    if (!query.trim()) {
      loadDocuments();
      return;
    }

    setIsLoading(true);
    try {
      const response = await ApiService.searchDocuments(query.trim());
      setDocuments(response.documents);
      setHasMore(false); // Search results don't paginate
    } catch (error) {
      Alert.alert('Error', 'Search failed');
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteDocument = async (documentId) => {
    Alert.alert(
      'Delete Document',
      'Are you sure you want to delete this document?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ApiService.deleteDocument(documentId);
              setDocuments(prev => prev.filter(doc => doc._id !== documentId));
              Alert.alert('Success', 'Document deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete document');
              console.error('Delete error:', error);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderDocument = ({item}) => (
    <TouchableOpacity
      style={styles.documentItem}
      onPress={() => navigation.navigate('DocumentDetail', {documentId: item._id})}>
      <View style={styles.documentContent}>
        <View style={styles.documentInfo}>
          <Text style={styles.documentTitle}>{item.filename}</Text>
          <Text style={styles.documentDate}>{formatDate(item.captured_at)}</Text>
          <Text style={styles.documentSize}>
            {(item.metadata.file_size / 1024).toFixed(1)} KB
          </Text>
          {item.ocr_text && (
            <Text style={styles.documentPreview} numberOfLines={2}>
              {item.ocr_text.substring(0, 100)}...
            </Text>
          )}
        </View>
        
        <View style={styles.documentActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => deleteDocument(item._id)}>
            <Icon name="delete" size={20} color="#f44336" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="description" size={80} color="#ccc" />
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'No documents found' : 'No documents yet'}
      </Text>
      <Text style={styles.emptyText}>
        {searchQuery
          ? 'Try a different search term'
          : 'Start by scanning your first document'}
      </Text>
      {!searchQuery && (
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => navigation.navigate('Camera')}>
          <Icon name="camera-alt" size={20} color="#ffffff" />
          <Text style={styles.scanButtonText}>Scan Document</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color="#2196F3" />
        <Text style={styles.loadingMoreText}>Loading more...</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      {showSearch && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Icon name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search documents..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => searchDocuments(searchQuery)}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  loadDocuments();
                }}>
                <Icon name="clear" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => searchDocuments(searchQuery)}>
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {searchQuery ? `Search: "${searchQuery}"` : 'My Documents'}
        </Text>
        <TouchableOpacity
          style={styles.toggleSearchButton}
          onPress={() => setShowSearch(!showSearch)}>
          <Icon name="search" size={24} color="#2196F3" />
        </TouchableOpacity>
      </View>

      {/* Documents List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading documents...</Text>
        </View>
      ) : (
        <FlatList
          data={documents}
          renderItem={renderDocument}
          keyExtractor={(item) => item._id}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
          onEndReached={loadMoreDocuments}
          onEndReachedThreshold={0.1}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={documents.length === 0 ? styles.emptyList : null}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Camera')}>
        <Icon name="camera-alt" size={24} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  searchButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  toggleSearchButton: {
    padding: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  documentItem: {
    backgroundColor: '#ffffff',
    marginHorizontal: 15,
    marginVertical: 5,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  documentContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  documentDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  documentSize: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
  documentPreview: {
    fontSize: 14,
    color: '#555',
    fontStyle: 'italic',
  },
  documentActions: {
    marginLeft: 10,
  },
  actionButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  scanButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  scanButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingMoreText: {
    marginLeft: 10,
    color: '#666',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default DocumentsScreen;
