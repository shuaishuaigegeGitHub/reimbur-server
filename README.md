# reimbur-server

## 介绍

报销系统-后端

## 安装依赖

```
yarn
```

## 编写配置文件

复制样例配置文件 `.env.example` 为 `.env`，然后根据自己的开发环境，修改相关的 Mysql 配置

## 开发环境启动项目

```
yarn dev
```

## 部署生产环境

> 需要服务器全局安装 pm2 ，`npm install -g pm2`

```
yarn start
```

## 开发介绍

启动文件为 `src/index.js` 文件：

```javascript
require("dotenv/config"); // 加载 .env 配置文件
require("module-alias/register"); // 设置目录别名，在 package.json 还有个 _moduleAliases
// 下面两个配置ES6语法
require("babel-polyfill");
require("babel-register");
// 启动程序
require("./app");
```

在 `src/app.js` 中就创建了 `Application` 实例，`Application.js` 是最主要的启动文件，这里主要做了：

-   创建 Koa 实例
-   koa-router 的自动加载
-   中间件的自动配置
-   数据库表的 model 自动同步（仅开发使用）

### 日志的使用

日志工具在 `app/util/logger.js`。

在路由层可以使用：`ctx.logger.debug("返回数据：%J", data)` 来调用。

在其他地方可以使用：`global.logger.error("错误：%s", err.stack);` 来调用。

### 提交检查

每次在 `git commit '提交信息'` 之前都会进行 `eslint src --fix` 进行检查，修复
如果没通过 eslint 检测，则无法进行提交。
