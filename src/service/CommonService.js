import fs from "fs";
import { qiniuUpload } from "@/util/qiniu";
import config from "@/config/index";
import dayjs from "dayjs";
import { v4 as uuidv4 } from "uuid";

/**
 * 上传文件
 */
export const upload = async (file, params = {}) => {
    let { suffix, prefix } = params;
    let qiniuFileName = `upload/${dayjs().format("YYYYMMDD")}/`;
    if (prefix) {
        qiniuFileName += prefix + "/";
    }
    qiniuFileName += uuidv4();
    if (suffix) {
        qiniuFileName += suffix;
    }
    const option = {
        filePath: file.path,
        qiniuFileName: qiniuFileName,
    };
    await qiniuUpload(option);
    fs.unlinkSync(file.path);
    return {
        url: `${config.qiniu.host}/${option.qiniuFileName}`,
    };
};
