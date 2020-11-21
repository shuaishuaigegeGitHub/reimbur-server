import axios from "@/util/axios";
/* 对接用户权限管理系统的服务层 */

// 用户权限管理系统的API网址
const USER_PERMISSION_SYSTEM_BASE_URL = process.env.USER_PERMISSION_SYSTEM_BASE_URL;

/**
 * 查询状态正常的用户信息
 */
export const queryUserList = async (token) => {
    const res = await axios({
        url: USER_PERMISSION_SYSTEM_BASE_URL + "/admin/user/getUsers",
        method: "POST",
        headers: {
            token,
        },
        data: {
            status: 0,
        },
    });
    return res.userList;
};

/**
 * 查询所有系统的信息
 * @param {*} token
 */
export const getSystem = async (token) => {
    let res = await axios({
        url: USER_PERMISSION_SYSTEM_BASE_URL + "/admin/menu/onLevelMune",
        method: "POST",
        data: {
            token,
        },
    });
    return res.list;
};

/**
 * 从oa系统获取财务系统的菜单信息
 */
export const getMenu = async (token) => {
    let res = await axios({
        url: USER_PERMISSION_SYSTEM_BASE_URL + "/admin/menu/userMenuTree",
        method: "POST",
        data: {
            token,
            perms: "APP_CONFIG",
        },
    });
    if (res.datas.length) {
        res.datas[0].address = res.address;
    }
    return res.datas;
};

/**
 * 修改用户是否首次登陆
 * @param {string} token
 */
export const changeLoginStatus = async (token) => {
    let res = await axios({
        url: USER_PERMISSION_SYSTEM_BASE_URL + "/admin/user/addFirstLogin",
        method: "POST",
        data: {
            token,
            first_login: "APP_CONFIG",
        },
    });
    return res;
};
