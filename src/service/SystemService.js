import axios from "@/util/axios";
import dayjs from "dayjs";
import { sign } from "@/util/crypto";

/**
 * 商务系统后端地址
 */
const BUSINESS_BASE_URL = process.env.BUSINESS_BASE_URL;

/**
 * 财务系统后端地址
 */
const FINANCIAL_BASE_URL = process.env.FINANCIAL_BASE_URL;

/**
 * 向商务系统进行买卖量，抵扣结算操作
 * @param {Array} params [{ id: 1, type: 1, remark: '备注' }, { id: 6, type: 3, deal: 2 }]
 */
export const settlement = async (params, operator = "系统自动结算") => {
    let sendData = {
        data: params,
        userName: operator,
        time: dayjs().unix(),
    };
    sendData.sign = sign(sendData);
    let res = await axios({
        url: BUSINESS_BASE_URL + "/admin/financial/settlement",
        method: "POST",
        data: sendData,
    });
    return res;
};

/**
 * 财务系统交易支付接口
 * @param {*} params
 */
export const transaction = async (params) => {
    let sendData = {
        data: params,
        time: dayjs().unix(),
    };
    sendData.sign = sign(sendData);
    let res = await axios({
        url: FINANCIAL_BASE_URL + "/api/inside-system/transaction",
        method: "POST",
        data: sendData,
    });
    return res;
};
