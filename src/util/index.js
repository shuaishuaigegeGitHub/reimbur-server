/**
 * 数组分组
 * @param {*} arr
 * @param {*} columnOrFn 字段名 或者 一个函数返回字段名
 */
export const groupBy = (arr, columnOrFn) => {
    if (!columnOrFn) {
        return arr;
    }
    const result = {};
    let column = columnOrFn;
    arr.forEach((item) => {
        if (typeof columnOrFn === "function") {
            column = columnOrFn(item);
        }
        if (result[item[column]]) {
            result[item[column]].push(item);
        } else {
            result[item[column]] = [item];
        }
    });
    return result;
};
