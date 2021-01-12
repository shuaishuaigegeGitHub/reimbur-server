import Router from "koa-router";
import * as ReimburService from "@/service/ReimburService";
import * as SystemService from "@/service/SystemService";

const router = new Router({
    prefix: "/reimbur",
});

/**
 * 查询可编辑流程实例
 */
router.get("/query-editable", async (ctx) => {
    const params = ctx.request.query || {};
    params.user_id = ctx.state.uid;
    const data = await ReimburService.queryEditable(params);
    ctx.renderJson({ msg: "查询成功", data });
});

/**
 * 查询我的报销
 */
router.post("/query-my-baoxiao", async (ctx) => {
    const params = ctx.request.body || {};
    params.id = ctx.state.uid;
    const data = await ReimburService.queryMyBaoXiao(params);
    ctx.renderJson({ msg: "查询成功", data });
});

/**
 * 查询我的审批
 */
router.post("/query-my-shenpi", async (ctx) => {
    const params = ctx.request.body || {};
    params.id = ctx.state.uid;
    const data = await ReimburService.queryMyShenpi(params);
    ctx.renderJson({ msg: "查询成功", data });
});

/**
 * 查询我的待审批个数
 */
router.get("/query-my-shenpi-count", async (ctx) => {
    const params = {
        id: ctx.state.uid,
    };
    const data = await ReimburService.queryMyShenpiCount(params);
    ctx.renderJson({ msg: "查询成功", data });
});

/**
 * 报销申请流程开始
 */
router.post("/add", async (ctx) => {
    await ReimburService.startBaoXiaoProcess(ctx.request.body, {
        userid: ctx.state.uid,
        username: ctx.state.userName,
    });
    ctx.renderJson({ msg: "申请成功" });
});

/**
 * 修改流程实例参数
 */
router.post("/edit", async (ctx) => {
    const params = ctx.request.body || {};
    params.user_id = ctx.state.uid;
    await ReimburService.editProcess(params);
    ctx.renderJson({ msg: "修改成功" });
});

/**
 * 取消报销流程
 */
router.post("/cancel", async (ctx) => {
    const params = ctx.request.body || {};
    params.user_id = ctx.state.uid;
    params.user_name = ctx.state.userName;
    await ReimburService.cancelBaoXiaoProcess(params);
    ctx.renderJson({ msg: "操作成功" });
});

/**
 * 同意报销
 */
router.post("/complete", async (ctx) => {
    const params = ctx.request.body || {};
    params.user_id = ctx.state.uid;
    params.user_name = ctx.state.userName;
    await ReimburService.completeBaoXiaoProcess(params);
    ctx.renderJson({ msg: "操作成功" });
});

/**
 * 拒绝报销
 */
router.post("/reject", async (ctx) => {
    const params = ctx.request.body || {};
    params.user_id = ctx.state.uid;
    params.user_name = ctx.state.userName;
    await ReimburService.rejectBaoXiaoProcess(params);
    ctx.renderJson({ msg: "操作成功" });
});

/**
 * 查询流程实例走过的流程及状态
 */
router.get("/query-instance-process-status", async (ctx) => {
    const params = ctx.request.query || {};
    const data = await ReimburService.queryInstanceProcessStatus(params.id);
    ctx.renderJson({ msg: "查询成功", data });
});

/**
 * 银行转账
 */
router.post("/transfer", async (ctx) => {
    const params = ctx.request.body || {};
    params.user_id = ctx.state.uid;
    params.user_name = ctx.state.userName;
    await ReimburService.transfer(params);
    ctx.renderJson({ msg: "转账成功" });
});

/**
 * 获取对应ID的报销数据
 */
router.get("/instance/:id", async (ctx) => {
    const data = await ReimburService.getReimburInstance(ctx.params.id);
    ctx.renderJson({ msg: "查询成功", data });
});

/**
 * 获取对应ID的报销基本数据
 */
router.get("/base-data/:id", async (ctx) => {
    const data = await ReimburService.getReimburBaseData(ctx.params.id);
    ctx.renderJson({ msg: "查询成功", data });
});

/**
 * 获取科目树
 */
router.get("/subject-tree", async (ctx) => {
    const data = await SystemService.getSubjectTree(ctx.token);
    ctx.renderJson({ msg: "查询成功", data });
});

/**
 * 添加评论
 */
router.post("/comment", async (ctx) => {
    const params = ctx.request.body || {};
    params.userid = ctx.state.uid;
    params.username = ctx.state.userName;
    const data = await ReimburService.addComment(params);
    ctx.renderJson({ msg: "查询成功", data });
});

export default router;
