// home.js
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
    allOrchids: [],
    currentCategoryName: '全部品种',
    filteredOrchids: []
  },

  // 页面加载
  onLoad: function(options) {
    this.initCloudDatabase();
  },

  // 页面显示
  onShow: function() {
    if (this.data.categories.length === 0 || this.data.allOrchids.length === 0) {
      this.loadData();
    }
  },

  // 下拉刷新
  onPullDownRefresh: function() {
    this.loadData().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 初始化云数据库
  initCloudDatabase: function() {
    // 检查云开发环境
    if (typeof wx.cloud === 'undefined') {
      wx.showToast({
        title: '云开发未初始化',
        icon: 'error'
      });
      this.setData({
        isLoading: false
      });
      return;
    }
    
    // 初始化云开发
    wx.cloud.init({
      env: 'cloud1-9grlagxidd6e1010' // 替换为你的云环境ID
    });
    
    this.loadData();
  },

  // 加载数据
  loadData: function() {
    this.setData({
      isLoading: true
    });

    return Promise.all([
      this.loadCategories(),
      this.loadOrchids()
    ]).catch(error => {
      console.error('加载数据失败:', error);
      wx.showToast({
        title: '数据加载失败',
        icon: 'error'
      });
    }).finally(() => {
      this.setData({
        isLoading: false
      });
    });
  },

  // 加载分类数据
  loadCategories: function() {
    return new Promise((resolve, reject) => {
      // 使用云数据库
      const db = wx.cloud.database();
      db.collection('orchid-categories').get({
        success: res => {
          let categories = [];
          if (res.data && res.data.length > 0) {
            categories = res.data;
          } else {
            // 默认分类数据
            categories = [
              { id: 'all', name: '全部', icon: '🌸' },
              { id: 'cymbidium', name: '兜兰', icon: '🌺' },
              { id: 'phalaenopsis', name: '蝴蝶兰', icon: '🦋' },
              { id: 'dendrobium', name: '石斛兰', icon: '🪨' },
              { id: 'cattleya', name: '卡特兰', icon: '💜' },
              { id: 'oncidium', name: '文心兰', icon: '💛' },
              { id: 'vanda', name: '万代兰', icon: '🟣' }
            ];
          }
          
          this.setData({
            categories: categories
          });
          resolve();
        },
        fail: err => {
          console.error('加载分类失败:', err);
          // 使用默认分类
          this.setData({
            categories: [
              { id: 'all', name: '全部', icon: '🌸' },
              { id: 'cymbidium', name: '兜兰', icon: '🌺' },
              { id: 'phalaenopsis', name: '蝴蝶兰', icon: '🦋' },
              { id: 'dendrobium', name: '石斛兰', icon: '🪨' },
              { id: 'cattleya', name: '卡特兰', icon: '💜' },
              { id: 'oncidium', name: '文心兰', icon: '💛' },
              { id: 'vanda', name: '万代兰', icon: '🟣' }
            ]
          });
          resolve();
        }
      });
    });
  },

  // 加载兰花数据
  loadOrchids: function(isLoadMore = false) {
    return new Promise((resolve, reject) => {
      const db = wx.cloud.database();
      let skip = 0;
      let currentPage = 1;

      if (isLoadMore) {
        currentPage = this.data.currentPage;
        skip = (currentPage - 1) * this.data.pageSize;
      } else {
        currentPage = 1;
        this.setData({
          currentPage: 1
        });
      }

      db.collection('orchids')
        .skip(skip)
        .limit(this.data.pageSize)
        .orderBy('createTime', 'desc')
        .get({
          success: res => {
            const newOrchids = res.data || [];
            let allOrchids = [];

            if (isLoadMore) {
              allOrchids = [...this.data.allOrchids, ...newOrchids];
            } else {
              allOrchids = newOrchids;
            }

            this.setData({
              allOrchids: allOrchids,
              hasMore: newOrchids.length === this.data.pageSize
            });
            
            this.updateFilteredOrchids();
            resolve();
          },
          fail: err => {
            console.error('加载兰花数据失败:', err);
            if (!isLoadMore) {
              this.setData({
                allOrchids: [],
                hasMore: false
              });
              this.updateFilteredOrchids();
            }
            reject(err);
          }
        });
    });
  },

  // 加载更多
  loadMore: function() {
    if (this.data.loadingMore || !this.data.hasMore) return;

    this.setData({
      loadingMore: true,
      currentPage: this.data.currentPage + 1
    });

    this.loadOrchids(true).catch(error => {
      console.error('加载更多失败:', error);
      this.setData({
        currentPage: this.data.currentPage - 1
      });
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }).finally(() => {
      this.setData({
        loadingMore: false
      });
    });
  },

  // 搜索输入处理
  onSearch: function(e) {
    const keyword = e.detail.value;
    this.setData({
      searchKeyword: keyword
    });

    // 防抖处理
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }

    this.searchTimer = setTimeout(() => {
      this.updateFilteredOrchids();
    }, 300);
  },

  // 清除搜索
  clearSearch: function() {
    this.setData({
      searchKeyword: ''
    });
    this.updateFilteredOrchids();
  },

  // 选择分类
  selectCategory: function(e) {
    const categoryId = e.currentTarget.dataset.id;
    this.setData({
      selectedCategory: categoryId
    });
    this.updateCurrentCategoryName();
    this.updateFilteredOrchids();
  },

  // 更新当前分类名称
  updateCurrentCategoryName: function() {
    const category = this.data.categories.find(cat => cat.id === this.data.selectedCategory);
    this.setData({
      currentCategoryName: category ? category.name : '全部品种'
    });
  },

  // 更新过滤后的兰花列表
  updateFilteredOrchids: function() {
    let filtered = this.data.allOrchids;

    // 分类过滤
    if (this.data.selectedCategory !== 'all') {
      filtered = filtered.filter(orchid => orchid.category === this.data.selectedCategory);
    }

    // 搜索过滤
    if (this.data.searchKeyword.trim()) {
      const keyword = this.data.searchKeyword.toLowerCase();
      filtered = filtered.filter(orchid => {
        return orchid.name.toLowerCase().includes(keyword) ||
               orchid.latin.toLowerCase().includes(keyword) ||
               (orchid.features && orchid.features.some(feature => 
                 feature.toLowerCase().includes(keyword)
               ));
      });
    }

    this.setData({
      filteredOrchids: filtered
    });
  },

  // 显示兰花详情
  showOrchidDetail: function(e) {
    const orchid = e.currentTarget.dataset.orchid;
    this.setData({
      selectedOrchid: orchid,
      showDetail: true
    });
  },

  // 关闭详情弹窗
  closeDetail: function() {
    this.setData({
      showDetail: false,
      selectedOrchid: null
    });
  },

  // 阻止弹窗关闭
  preventClose: function() {
    // 阻止事件冒泡
  },

  // 跳转到识别页面
  goToRecognition: function() {
    wx.navigateTo({
      url: '/pages/index/index'
    });
  },

  // 页面卸载
  onUnload: function() {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
  }
});