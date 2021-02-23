import axios from "@/util/axios";
import dayjs from "dayjs";

const AGENT_ID = process.env.DINGTALK_AGENTID;
const APP_KEY = process.env.DINGTALK_APPKEY;
const APP_SECRET = process.env.DINGTALK_APPSECRET;

/**
 * 钉钉的access_token
 */
const dingtalkAccessToken = {
    // access_token值
    value: "",
    // 过期时间戳（秒）
    expired: 0,
};

/**
 * 获取钉钉的access_token值
 */
async function getAccessToken() {
    const now = dayjs().unix();
    if (dingtalkAccessToken.expired >= now) {
        // 说明access_token还没过期
        return dingtalkAccessToken.value;
    }
    const params = {
        appkey: APP_KEY,
        appsecret: APP_SECRET,
    };
    const data = await axios({
        url: "https://oapi.dingtalk.com/gettoken",
        params,
    });
    if (data.errcode) {
        throw new Error(data.errmsg);
    }
    dingtalkAccessToken.value = data.access_token;
    dingtalkAccessToken.expired = now + 7200;
    return dingtalkAccessToken.value;
}

/**
 * 发送工作通知
 */
export const sendMsg = async (userid, msg) => {
    if (!userid) {
        return;
    }
    let access_token = await getAccessToken();
    const data = await axios({
        url:
            "https://oapi.dingtalk.com/topapi/message/corpconversation/asyncsend_v2",
        method: "POST",
        params: {
            access_token,
        },
        data: {
            agent_id: AGENT_ID,
            userid_list: userid,
            msg,
        },
    });
    global.logger.info("发送的消息：%J", msg);
    if (data.errcode) {
        global.logger.error(
            `发送工作通知异常：【code：${data.errcode}，msg：%s】`,
            data.errmsg
        );
        throw new Error(data.errmsg);
    }
};

/**
 * 根据手机号获取用户ID
 */
export const getUserIdByMobile = async (mobile) => {
    let access_token = await getAccessToken();
    const data = await axios({
        url: "https://oapi.dingtalk.com/user/get_by_mobile",
        params: {
            access_token,
            mobile,
        },
    });
    if (data.errcode) {
        global.logger.error("根据手机号获取用户ID异常：%s", data.errmsg);
        throw new Error(data.errmsg);
    }
    return data.userid;
};
