/*
 * @Author: lijinxin
 * @Date: 2018-11-26 16:53:27
 * @Email: lijinxin@fenglinghudong.com
 */
import config from "@/config/index";
import qiniu from "qiniu";

/**
 * 七牛云上传
 * @param {*} options { filePath, qiniuFileName }
 */
export const qiniuUpload = async (options) => {
    const accessKey = config.qiniu.accessKey;
    const secretKey = config.qiniu.secretKey;
    const bucket = config.qiniu.bucket;
    // 生成一个上传的凭证
    const mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
    // 设置七牛的上传空间
    const putPolicy = new qiniu.rs.PutPolicy({
        scope: bucket,
    });
    // 生成上传的Token
    const uploadToken = putPolicy.uploadToken(mac);

    // 实例化config
    const qiniuConf = new qiniu.conf.Config();

    // 空间对应的机房
    qiniuConf.zone = qiniu.zone.Zone_z1;
    const localFile = options.filePath;
    const formUploader = new qiniu.form_up.FormUploader(qiniuConf);
    const putExtra = new qiniu.form_up.PutExtra();
    // 文件上传
    return new Promise((resolved, reject) => {
        formUploader.putFile(uploadToken, options.qiniuFileName, localFile, putExtra, (respErr, respBody, respInfo) => {
            if (respErr) {
                reject(respErr);
            }
            if (respInfo.statusCode === 200) {
                resolved(respBody);
            } else {
                resolved(respBody);
            }
        });
    });
};
