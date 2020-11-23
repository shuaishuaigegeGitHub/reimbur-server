import sequelize from "../model/index";

// 查询字段匹配
const sqlReg = new RegExp(/SELECT([\s\S]*)FROM/i);

/**
 * 原生SQL分页工具
 * 如果 opts 中没有 page 和 size 参数，或者 page < 1, size < 1
 * 那么就不分页，直接执行返回一个数组，['数据]
 * 如果有 page 和 size 值，那么就进行分页，返回 { count: '总条数', list: ['分页数据'] }
 * @param {string} sql 原SQL
 * @param {array} replacements sequelize的参数
 * @param {object} opts 配置参数
 */
export const sqlPage = async (sql, replacements = [], opts = {}) => {
    if (!sql || sql.trim() === "") {
        throw new Error("sql 不能为空");
    }
    // 第几页，第一页为1
    let page = Math.floor(Number(opts.page || 0));
    // 每页的个数
    let size = Math.floor(Number(opts.size || 0));
    if (page && size) {
        // 只有这两个参数都存在时，才进行分页
        let regRes = sql.match(sqlReg);
        if (regRes) {
            let selectColumn = regRes[1];
            let countSql = sql.replace(selectColumn, " COUNT(*) AS totalSize ");
            let countRes = await sequelize.query(countSql, {
                type: sequelize.QueryTypes.SELECT,
                replacements,
                plain: true,
            });
            let count = countRes.totalSize;
            sql += " LIMIT ?, ?";
            // 最大页数
            let maxPage = Math.ceil(count / size);
            if (page > maxPage) {
                page = maxPage;
            }
            if (page < 1) {
                page = 1;
            }
            let start = (page - 1) * size;
            replacements.push(start, size);
            // 分页的数据
            let rows = await sequelize.query(sql, {
                type: sequelize.QueryTypes.SELECT,
                replacements,
            });
            return {
                count,
                rows,
            };
        }
    }
    // 直接执行SQL返回
    return await sequelize.query(sql, {
        type: sequelize.QueryTypes.SELECT,
        replacements,
    });
};
