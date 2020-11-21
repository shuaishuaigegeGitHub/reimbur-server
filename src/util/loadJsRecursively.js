import path from "path";
import requireDirectory from "require-directory";

// 项目根目录
const ROOT_DIR = process.cwd();

/**
 * 递归加载某个目录下的所有JS文件
 */
export default (directoryName, callback) => {
    requireDirectory(module, path.resolve(ROOT_DIR, "src", directoryName), {
        visit: (obj) => {
            if (obj && obj.default) {
                obj = obj.default;
            }
            callback(obj);
        },
    });
};
