const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

// 获取openid
const getOpenId = async () => {
  // 获取基础信息
  const wxContext = cloud.getWXContext();
  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  };
};

// 获取小程序二维码
const getMiniProgramCode = async () => {
  // 获取小程序二维码的buffer
  const resp = await cloud.openapi.wxacode.get({
    path: "pages/index/index",
  });
  const { buffer } = resp;
  // 将图片上传云存储空间
  const upload = await cloud.uploadFile({
    cloudPath: "code.png",
    fileContent: buffer,
  });
  return upload.fileID;
};

// 创建集合
const createCollection = async () => {
  try {
    // 创建集合
    await db.createCollection("sales");
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华东",
        city: "上海",
        sales: 11,
      },
    });
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华东",
        city: "南京",
        sales: 11,
      },
    });
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华南",
        city: "广州",
        sales: 22,
      },
    });
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华南",
        city: "深圳",
        sales: 22,
      },
    });
    return {
      success: true,
    };
  } catch (e) {
    // 这里catch到的是该collection已经存在，从业务逻辑上来说是运行成功的，所以catch返回success给前端，避免工具在前端抛出异常
    return {
      success: true,
      data: "create collection success",
    };
  }
};

// 查询数据
const selectRecord = async () => {
  // 返回数据库查询结果
  return await db.collection("sales").get();
};

// 更新数据
const updateRecord = async (event) => {
  try {
    // 遍历修改数据库信息
    for (let i = 0; i < event.data.length; i++) {
      await db
        .collection("sales")
        .where({
          _id: event.data[i]._id,
        })
        .update({
          data: {
            sales: event.data[i].sales,
          },
        });
    }
    return {
      success: true,
      data: event.data,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

// 新增数据
const insertRecord = async (event) => {
  try {
    const insertRecord = event.data;
    // 插入数据
    await db.collection("sales").add({
      data: {
        region: insertRecord.region,
        city: insertRecord.city,
        sales: Number(insertRecord.sales),
      },
    });
    return {
      success: true,
      data: event.data,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

// 删除数据
const deleteRecord = async (event) => {
  try {
    await db
      .collection("sales")
      .where({
        _id: event.data._id,
      })
      .remove();
    return {
      success: true,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

// 保存用户信息
const saveUserInfo = async (event) => {
  try {
    const { openid, userInfo, updateTime } = event.data;
    
    if (!openid) {
      return {
        success: false,
        errMsg: 'openid is required'
      };
    }

    // 先检查用户是否已存在
    const existUser = await db.collection('users').where({
      openid: openid
    }).get();

    if (existUser.data.length > 0) {
      // 用户已存在，更新用户信息
      await db.collection('users').where({
        openid: openid
      }).update({
        data: {
          userInfo: userInfo,
          updateTime: updateTime
        }
      });
    } else {
      // 用户不存在，创建新用户记录
      await db.collection('users').add({
        data: {
          openid: openid,
          userInfo: userInfo,
          createTime: updateTime,
          updateTime: updateTime
        }
      });
    }

    return {
      success: true,
      data: {
        openid: openid,
        userInfo: userInfo
      }
    };
  } catch (e) {
    console.error('保存用户信息失败:', e);
    return {
      success: false,
      errMsg: e.message || e
    };
  }
};

// 获取用户信息
const getUserInfo = async (event) => {
  try {
    const { openid } = event.data;
    
    if (!openid) {
      return {
        success: false,
        errMsg: 'openid is required'
      };
    }

    const result = await db.collection('users').where({
      openid: openid
    }).get();

    if (result.data.length > 0) {
      return {
        success: true,
        data: result.data[0]
      };
    } else {
      return {
        success: false,
        errMsg: 'User not found'
      };
    }
  } catch (e) {
    console.error('获取用户信息失败:', e);
    return {
      success: false,
      errMsg: e.message || e
    };
  }
};

// 保存识别历史
const saveRecognitionHistory = async (event) => {
  try {
    const { openid, imageUrl, result, timestamp } = event.data;
    
    if (!openid || !result) {
      return {
        success: false,
        errMsg: 'openid and result are required'
      };
    }

    // 保存识别历史
    await db.collection('recognition_history').add({
      data: {
        openid: openid,
        imageUrl: imageUrl,
        result: result,
        timestamp: timestamp || Date.now(),
        createTime: new Date()
      }
    });

    return {
      success: true,
      message: 'Recognition history saved successfully'
    };
  } catch (e) {
    console.error('保存识别历史失败:', e);
    return {
      success: false,
      errMsg: e.message || e
    };
  }
};

// 获取识别历史
const getRecognitionHistory = async (event) => {
  try {
    const { openid, page = 1, limit = 10 } = event.data;
    
    if (!openid) {
      return {
        success: false,
        errMsg: 'openid is required'
      };
    }

    const skip = (page - 1) * limit;
    
    const result = await db.collection('recognition_history')
      .where({ openid: openid })
      .orderBy('timestamp', 'desc')
      .skip(skip)
      .limit(limit)
      .get();

    // 获取总数
    const countResult = await db.collection('recognition_history')
      .where({ openid: openid })
      .count();

    return {
      success: true,
      data: {
        list: result.data,
        total: countResult.total,
        page: page,
        hasMore: skip + result.data.length < countResult.total
      }
    };
  } catch (e) {
    console.error('获取识别历史失败:', e);
    return {
      success: false,
      errMsg: e.message || e
    };
  }
};

// 删除识别历史
const deleteRecognitionHistory = async (event) => {
  try {
    const { openid, historyId } = event.data;
    
    if (!openid || !historyId) {
      return {
        success: false,
        errMsg: 'openid and historyId are required'
      };
    }

    await db.collection('recognition_history')
      .where({
        _id: historyId,
        openid: openid // 确保用户只能删除自己的历史记录
      })
      .remove();

    return {
      success: true,
      message: 'History deleted successfully'
    };
  } catch (e) {
    console.error('删除识别历史失败:', e);
    return {
      success: false,
      errMsg: e.message || e
    };
  }
};

// 获取用户统计数据
const getUserStats = async (event) => {
  try {
    const { openid } = event.data;
    
    if (!openid) {
      return {
        success: false,
        errMsg: 'openid is required'
      };
    }

    // 获取总识别次数
    const totalResult = await db.collection('recognition_history')
      .where({ openid: openid })
      .count();

    // 获取高准确率识别次数（置信度 > 0.7）
    const accurateResult = await db.collection('recognition_history')
      .where({
        openid: openid,
        'result.confidence': db.command.gt(0.7)
      })
      .count();

    // 获取第一次使用时间来计算使用天数
    const firstRecord = await db.collection('recognition_history')
      .where({ openid: openid })
      .orderBy('timestamp', 'asc')
      .limit(1)
      .get();

    let usageDays = 0;
    if (firstRecord.data.length > 0) {
      const firstTime = firstRecord.data[0].timestamp;
      const now = Date.now();
      usageDays = Math.ceil((now - firstTime) / (1000 * 60 * 60 * 24));
    }

    return {
      success: true,
      data: {
        totalRecognitions: totalResult.total,
        accurateRecognitions: accurateResult.total,
        favoriteCount: 0, // 暂时设为0，后续可以添加收藏功能
        usageDays: usageDays
      }
    };
  } catch (e) {
    console.error('获取用户统计失败:', e);
    return {
      success: false,
      errMsg: e.message || e
    };
  }
};

// 云函数入口函数
exports.main = async (event, context) => {
  switch (event.type) {
    case "getOpenId":
      return await getOpenId();
    case "getMiniProgramCode":
      return await getMiniProgramCode();
    case "createCollection":
      return await createCollection();
    case "selectRecord":
      return await selectRecord();
    case "updateRecord":
      return await updateRecord(event);
    case "insertRecord":
      return await insertRecord(event);
    case "deleteRecord":
      return await deleteRecord(event);
    case "saveUserInfo":
      return await saveUserInfo(event);
    case "getUserInfo":
      return await getUserInfo(event);
    
    case "saveRecognitionHistory":
      return await saveRecognitionHistory(event);
    case "getRecognitionHistory":
      return await getRecognitionHistory(event);
    case "deleteRecognitionHistory":
      return await deleteRecognitionHistory(event);
    case "getUserStats":
      return await getUserStats(event);

    default:
      return {
        success: false,
        errMsg: `Unknown function type: ${event.type}`
      };
  }
};