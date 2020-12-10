import fs from "fs";
import path from "path";
import config from "@/config/index";
import ejs from "ejs";
import sequelize from "@/model/index";

// model模板路径
const modelTemplate = fs.readFileSync(path.resolve(process.cwd(), "src", "template", "model.ejs")).toString();

// model 目录
const MODEL_DIR = path.resolve(process.cwd(), "src", "model", "main");

/**
 * 自动创建model
 * @param {string} tableName 表名
 * @param {boolean} override 如果文件已经存在是否覆盖
 * @param {boolean} sequelizeConn 数据库连接
 */
export const autoCreateModel = async (tableName, { override = false, sequelizeConn = null, modelDir = MODEL_DIR }) => {
    let conn = sequelizeConn || sequelize;
    let modelFile = path.resolve(modelDir, tableName + ".js");
    if (fs.existsSync(modelFile) && !override) {
        global.logger.info(`"${modelFile}" 文件已经存在！`);
        return;
    }
    let sql = `
        SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_KEY, EXTRA, COLUMN_COMMENT, ORDINAL_POSITION 
        FROM information_schema.COLUMNS 
        WHERE TABLE_NAME = '${tableName}' 
        AND TABLE_SCHEMA = '${config.sequelize.database}'
        ORDER BY ORDINAL_POSITION;
    `;
    let data = await conn.query(sql, {
        type: conn.QueryTypes.SELECT,
    });
    data = data.map((item) => {
        let temp = {
            name: item.COLUMN_NAME,
            type: item.COLUMN_TYPE.replace(" unsigned", "").toUpperCase().replace("VARCHAR", "STRING"),
            primary: item.COLUMN_KEY === "PRI",
            autoIncrement: item.EXTRA === "auto_increment",
            comment: item.COLUMN_COMMENT,
        };
        if (temp.type.startsWith("INT") || temp.type.startsWith("int")) {
            temp.type = "INTEGER";
        }
        return temp;
    });
    let result = ejs.render(modelTemplate, {
        tableName,
        columns: data,
    });
    fs.writeFileSync(modelFile, result);
};

/**
 * 生成指定数据库的所有数据表的model
 * @param {string} shcema 数据库名
 * @param {boolean} override 是否覆盖原文件
 * @param {boolean} sequelizeConn 数据库连接
 * @param {boolean} modelDir 放置model的目录
 */
export const autoCreateSchema = async (shcema, { override = false, sequelizeConn = null, modelDir }) => {
    let conn = sequelizeConn || sequelize;
    let sql = `
        SELECT DISTINCT TABLE_NAME
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = '${shcema}'
        ORDER BY TABLE_NAME;
    `;
    let data = await conn.query(sql, {
        type: conn.QueryTypes.SELECT,
    });
    data = data.map((item) => item.TABLE_NAME);
    for (let i = 0; i < data.length; i++) {
        await autoCreateModel(data[i], { override, sequelizeConn, modelDir });
    }
};
