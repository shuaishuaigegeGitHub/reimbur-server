import GlobalError from "@/common/GlobalError";
import { qiniuUpload } from "@/util/qiniu";
import dayjs from "dayjs";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";

/**
 * 图片上传
 * @param {*} file
 */
export const imageUplaod = async (file) => {
    if (!file) {
        throw new GlobalError(500, "上传失败");
    }
    let filePath = file.path;
    let suffix = file.name.substring(file.name.lastIndexOf("."));
    if (!suffix) {
        suffix = ".png";
    }
    let fileName = uuidv4().replace(/-/g, "") + suffix;

    let qiniuFileName = `uplaods/${dayjs().format("YYYYMMDD")}/${fileName}`;

    let options = {
        filePath,
        qiniuFileName,
    };

    const result = await qiniuUpload(options);
    fs.unlinkSync(filePath);
    return process.env.QINIU_HOST + "/" + result.key;
};
