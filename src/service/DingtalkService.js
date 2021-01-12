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
    value: "ee4a0e46631d36039fde3db96b47e07f",
    // 过期时间戳（秒）
    expired: 1610452576,
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
export const sendMsg = async () => {
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
            userid_list: "15872011227506960",
            msg: {
                msgtype: "action_card",
                action_card: {
                    title: "采购审批",
                    markdown:
                        "**廖鑫海提交的采购申请**\n\n申请事由：这是啥？\n\n期望交付日期：2021-01-11",
                    btn_orientation: "1",
                    btn_json_list: [
                        {
                            title: "拒绝",
                            action_url: "https://reimbur.feigo.fun",
                        },
                        {
                            title: "同意",
                            action_url: "https://reimbur.feigo.fun",
                        },
                    ],
                },
            },
        },
    });
    if (data.errcode) {
        throw new Error(data.errmsg);
    }
    console.log(data);
};

/**
 * 获取用户列表
 */
export const getUserListByDept = async () => {
    let access_token = await getAccessToken();
    const data = await axios({
        url: "https://oapi.dingtalk.com/user/getDeptMember",
        params: {
            access_token,
            deptId: 348523101,
        },
    });
    if (data.errcode) {
        throw new Error(data.errmsg);
    }
    console.log(data);
};

/**
 * 根据用户ID获取用户信息
 */
export const getUserInfoById = async () => {
    let access_token = await getAccessToken();
    const data = await axios({
        url: "https://oapi.dingtalk.com/user/get",
        params: {
            access_token,
            userid: "15872011227506960",
        },
    });
    if (data.errcode) {
        throw new Error(data.errmsg);
    }
    console.log(data);
};

// let deptList = {
//     errcode: 0,
//     department: [
//         {
//             createDeptGroup: true,
//             name: "产品一组",
//             id: 408175231,
//             autoAddUser: true,
//             parentid: 144275057,
//         },
//         {
//             ext: '{"faceCount":"7"}',
//             createDeptGroup: true,
//             name: "发行部",
//             id: 144267049,
//             autoAddUser: true,
//             parentid: 1,
//         },
//         {
//             ext: '{"faceCount":"103"}',
//             createDeptGroup: true,
//             name: "厦门风领科技有限公司",
//             id: 1,
//             autoAddUser: true,
//         },
//         {
//             ext: '{"faceCount":"5"}',
//             createDeptGroup: true,
//             name: "产品二组",
//             id: 408053346,
//             autoAddUser: true,
//             parentid: 144275057,
//         },
//         {
//             ext: '{"faceCount":"49"}',
//             createDeptGroup: true,
//             name: "产品部",
//             id: 144275057,
//             autoAddUser: true,
//             parentid: 1,
//         },
//         {
//             ext: '{"faceCount":"3"}',
//             createDeptGroup: true,
//             name: "投放组",
//             id: 144183686,
//             autoAddUser: true,
//             parentid: 144267049,
//         },
//         {
//             ext: '{"faceCount":"5"}',
//             createDeptGroup: true,
//             name: "技术部",
//             id: 144198324,
//             autoAddUser: true,
//             parentid: 1,
//         },
//         {
//             ext: '{"faceCount":"20"}',
//             createDeptGroup: true,
//             name: "美术组",
//             id: 144149881,
//             autoAddUser: true,
//             parentid: 144275057,
//         },
//         {
//             ext: '{"faceCount":"3"}',
//             createDeptGroup: true,
//             name: "策划组",
//             id: 348470406,
//             autoAddUser: true,
//             parentid: 144275057,
//         },
//         {
//             ext: '{"faceCount":"2"}',
//             createDeptGroup: true,
//             name: "财务部",
//             id: 145578934,
//             autoAddUser: true,
//             parentid: 1,
//         },
//         {
//             ext: '{"faceCount":"4"}',
//             createDeptGroup: true,
//             name: "商务组",
//             id: 145516961,
//             autoAddUser: true,
//             parentid: 144267049,
//         },
//         {
//             createDeptGroup: true,
//             name: "平台组",
//             id: 144095860,
//             autoAddUser: true,
//             parentid: 144275057,
//         },
//         {
//             createDeptGroup: true,
//             name: "测试组",
//             id: 348660304,
//             autoAddUser: true,
//             parentid: 144275057,
//         },
//         {
//             createDeptGroup: true,
//             name: "产品公共组",
//             id: 408223227,
//             autoAddUser: true,
//             parentid: 144275057,
//         },
//         {
//             ext: '{"faceCount":"3"}',
//             createDeptGroup: true,
//             name: "人事组",
//             id: 347291900,
//             autoAddUser: true,
//             parentid: 348443172,
//         },
//         {
//             ext: '{"faceCount":"2"}',
//             createDeptGroup: true,
//             name: "行政组",
//             id: 347320838,
//             autoAddUser: true,
//             parentid: 348443172,
//         },
//         {
//             createDeptGroup: true,
//             name: "微信2组",
//             id: 347414936,
//             autoAddUser: true,
//             parentid: 144267049,
//         },
//         {
//             createDeptGroup: true,
//             name: "微信1组",
//             id: 347923795,
//             autoAddUser: true,
//             parentid: 144267049,
//         },
//         {
//             createDeptGroup: true,
//             name: "微信3组",
//             id: 348181511,
//             autoAddUser: true,
//             parentid: 144267049,
//         },
//         {
//             ext: '{"faceCount":"2"}',
//             createDeptGroup: true,
//             name: "商务技术组",
//             id: 348385224,
//             autoAddUser: true,
//             parentid: 144198324,
//         },
//         {
//             createDeptGroup: true,
//             name: "后勤组",
//             id: 348427482,
//             autoAddUser: true,
//             parentid: 144267049,
//         },
//         {
//             ext: '{"faceCount":"5"}',
//             createDeptGroup: true,
//             name: "综合部",
//             id: 348443172,
//             autoAddUser: true,
//             parentid: 1,
//         },
//         {
//             ext: '{"faceCount":"0"}',
//             createDeptGroup: true,
//             name: "出纳",
//             id: 348513067,
//             autoAddUser: true,
//             parentid: 145578934,
//         },
//         {
//             createDeptGroup: true,
//             name: "会计",
//             id: 348518064,
//             autoAddUser: true,
//             parentid: 145578934,
//         },
//         {
//             createDeptGroup: true,
//             name: "财务技术组",
//             id: 348523101,
//             autoAddUser: true,
//             parentid: 144198324,
//         },
//         {
//             ext: '{"faceCount":"1"}',
//             createDeptGroup: true,
//             name: "运营技术组",
//             id: 348524030,
//             autoAddUser: true,
//             parentid: 144198324,
//         },
//         {
//             ext: '{"faceCount":"1"}',
//             createDeptGroup: true,
//             name: "策划1组",
//             id: 348554375,
//             autoAddUser: true,
//             parentid: 348470406,
//         },
//         {
//             createDeptGroup: true,
//             name: "策划2组",
//             id: 348565344,
//             autoAddUser: true,
//             parentid: 348470406,
//         },
//         {
//             createDeptGroup: true,
//             name: "财务",
//             id: 348626031,
//             autoAddUser: true,
//             parentid: 145578934,
//         },
//         {
//             createDeptGroup: true,
//             name: "品宣组",
//             id: 402877858,
//             autoAddUser: true,
//             parentid: 144267049,
//         },
//         {
//             ext: '{"faceCount":"2"}',
//             createDeptGroup: true,
//             name: "风领文化传媒",
//             id: 408063026,
//             autoAddUser: true,
//             parentid: 1,
//         },
//         {
//             createDeptGroup: false,
//             name: "美宣组",
//             id: 436684694,
//             autoAddUser: false,
//             parentid: 144267049,
//         },
//     ],
//     errmsg: "ok",
// };
