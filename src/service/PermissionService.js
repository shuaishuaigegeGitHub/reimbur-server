import axios from "@/util/axios";
import { sign, deSign } from "@/util/crypto";

// 从oa系统获取系统级别的信息
export const getSystem = async (token) => {
    let res = await axios({
        url: process.env.OA_SYSTEM_BASE_URL + "/admin/menu/onLevelMune",
        method: "post",
        data: {
            token,
        },
    });
    return res.list;
};

/**
 * 从OA获取所有用户信息
 */
export const getUsers = async (token) => {
    let res = await axios({
        url: process.env.OA_SYSTEM_BASE_URL + "/admin/user/getUsers",
        method: "post",
        headers: {
            token,
        },
    });
    return res.userList;
};

/**
 * 从OA获取所有部门信息
 */
export const getDepts = async () => {
    let signStr = sign({});
    let res = await axios({
        url: process.env.OA_SYSTEM_BASE_URL + "/admin/system_out/getDepts",
        method: "post",
        headers: {
            systemtoken: signStr,
        },
    });
    return res.data;
};
