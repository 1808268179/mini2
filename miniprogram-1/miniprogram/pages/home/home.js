Page({
  data: {
    searchKeyword: '',
    selectedCategory: 'all',
    showDetail: false,
    selectedOrchid: null,
    isLoading: true,
    loadingMore: false,
    hasMore: true,
    currentPage: 1,
    pageSize: 10,
    categories: [],
    orchids: [],
    allOrchids: []
  },

  onLoad() {
    this.initCloudDatabase();
  },

  onShow() {
    if (this.data.categories.length === 0 || this.data.allOrchids.length === 0) {
      this.loadData();
    }
  },

  onPullDownRefresh() {
    this.loadData().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  initCloudDatabase() {
    if (typeof wx.cloud === 'undefined') {
      wx.showToast({
        title: '云开发未初始化',
        icon: 'error'
      });
      this.setData({ isLoading: false });
      return;
    }
    this.loadData();
  },

  loadData() {
    this.setData({ isLoading: true });
    Promise.all([
      this.loadCategories(),
      this.loadOrchids()
    ]).finally(() => {
      this.setData({ isLoading: false });
    });
  },

  loadCategories() {
    wx.cloud.database().collection('orchid-categories').get().then(result => {
      if (result.data) {
        this.setData({ categories: result.data });
      }
    }).catch(error => {
      console.error('加载分类失败:', error);
    });
  },

  loadOrchids(isLoadMore = false) {
    const db = wx.cloud.database();
    let query = db.collection('orchids');
    
    if (isLoadMore) {
      query = query.skip((this.data.currentPage - 1) * this.data.pageSize);
    } else {
      this.setData({ currentPage: 1 });
    }
    
    query.limit(this.data.pageSize).orderBy('createTime', 'desc').get().then(result => {
      if (result.data) {
        const newOrchids = result.data;
        if (isLoadMore) {
          this.setData({
            allOrchids: [...this.data.allOrchids, ...newOrchids],
            hasMore: newOrchids.length === this.data.pageSize
          });
        } else {
          this.setData({
            allOrchids: newOrchids,
            hasMore: newOrchids.length === this.data.pageSize
          });
        }
      }
    }).catch(error => {
      console.error('加载兰花数据失败:', error);
    });
  },

  loadMore() {
    if (this.data.loadingMore || !this.data.hasMore) return;

    this.setData({ loadingMore: true });
    this.data.currentPage++;
    this.loadOrchids(true).finally(() => {
      this.setData({ loadingMore: false });
    });
  },

  onSearch(e) {
    const keyword = e.detail.value;
    this.setData({ searchKeyword: keyword });
  },

  clearSearch() {
    this.setData({ searchKeyword: '' });
  },

  selectCategory(e) {
    const categoryId = e.currentTarget.dataset.id;
    this.setData({ selectedCategory: categoryId });
  },

  getCurrentCategoryName() {
    const category = this.data.categories.find(cat => cat.id === this.data.selectedCategory);
    return category ? category.name : '全部品种';
  },

  showOrchidDetail(e) {
    const orchid = e.currentTarget.dataset.orchid;
    this.setData({ selectedOrchid: orchid, showDetail: true });
  },

  closeDetail() {
    this.setData({ showDetail: false, selectedOrchid: null });
  },

  stopPropagation(e) {
    e.stopPropagation();
  },

  goToRecognition() {
    wx.navigateTo({
      url: '/pages/index/index'
    });
  }
});