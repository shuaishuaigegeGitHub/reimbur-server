import Router from "koa-router";
import * as ReimburService from "@/service/ReimburService";
import * as SystemService from "@/service/SystemService";

const router = new Router({
    prefix: "/reimbur",
});

/**
 * 提交报销申请
 */
router.post("/submit", async (ctx) => {
    const params = ctx.request.body;
    params.create_id = ctx.state.uid;
    params.create_by = ctx.state.userName;
    const data = await ReimburService.submit(params);
    ctx.renderJson({ msg: "提交成功", data });
});

/**
 * 查询我的申请
 */
router.post("/query-application", async (ctx) => {
    const params = ctx.request.body;
    params.userid = ctx.state.uid;
    const data = await ReimburService.queryApplication(params);
    ctx.renderJson({ msg: "查询成功", data });
});

/**
 * 查询我的审批
 */
router.post("/query-approve", async (ctx) => {
    const params = ctx.request.body;
    params.userid = ctx.state.uid;
    const data = await ReimburService.queryApprove(params);
    ctx.renderJson({ msg: "查询成功", data });
});

/**
 * 查询抄送给我
 */
router.post("/query-my-copy", async (ctx) => {
    const params = ctx.request.body;
    params.userid = ctx.state.uid;
    const data = await ReimburService.queryCopyToMe(params);
    ctx.renderJson({ msg: "查询成功", data });
});

/**
 * 查询我的待审批个数
 */
router.get("/query-my-shenpi-count", async (ctx) => {
    const data = await ReimburService.queryMyShenpiCount(ctx.state.uid);
    ctx.renderJson({ msg: "查询成功", data });
});

/**
 * 查询报销申请的明细和流程
 */
router.get("/query-detail-process", async (ctx) => {
    const data = await ReimburService.queryDetailAndProcess(ctx.query.id);
    ctx.renderJson({ msg: "查询成功", data });
});

/**
 * 添加评论
 */
router.post("/comment", async (ctx) => {
    const params = ctx.request.body;
    params.userid = ctx.state.uid;
    params.username = ctx.state.userName;
    const data = await ReimburService.addComment(params);
    ctx.renderJson({ msg: "评论成功", data });
});

/**
 * 查询指定可编辑的报销数据
 */
router.get("/query-editable", async (ctx) => {
    const params = ctx.request.query;
    params.userid = ctx.state.uid;
    const data = await ReimburService.queryEditable(params);
    ctx.renderJson({ msg: "查询成功", data });
});

/**
 * 查询指定可编辑的报销数据
 */
router.post("/edit", async (ctx) => {
    const params = ctx.request.body;
    params.userid = ctx.state.uid;
    params.username = ctx.state.userName;
    const data = await ReimburService.edit(params);
    ctx.renderJson({ msg: "编辑成功", data });
});

/**
 * 取消
 */
router.post("/cancel", async (ctx) => {
    const params = ctx.request.body;
    params.userid = ctx.state.uid;
    params.username = ctx.state.userName;
    const data = await ReimburService.cancel(params);
    ctx.renderJson({ msg: "操作成功", data });
});

/**
 * 同意
 */
router.post("/agree", async (ctx) => {
    const params = ctx.request.body;
    params.userid = ctx.state.uid;
    params.username = ctx.state.userName;
    const data = await ReimburService.agree(params);
    ctx.renderJson({ msg: "操作成功", data });
});

/**
 * 同意
 */
router.post("/reject", async (ctx) => {
    const params = ctx.request.body;
    params.userid = ctx.state.uid;
    params.username = ctx.state.userName;
    const data = await ReimburService.reject(params);
    ctx.renderJson({ msg: "操作成功", data });
});

/**
 * 保存科目
 */
router.post("/save-subject", async (ctx) => {
    const params = ctx.request.body;
    await ReimburService.saveSubject(params);
    ctx.renderJson({ msg: "操作成功" });
});

/**
 * 保存发票号
 */
router.post("/save-receipt", async (ctx) => {
    const params = ctx.request.body;
    await ReimburService.saveReceipt(params);
    ctx.renderJson({ msg: "操作成功" });
});

/**
 * 出纳打款
 */
router.post("/transfer", async (ctx) => {
    const params = ctx.request.body;
    params.userid = ctx.state.uid;
    params.username = ctx.state.userName;
    await ReimburService.transfer(params);
    ctx.renderJson({ msg: "操作成功" });
});

/**
 * 获取最近一次用户的基本信息
 */
router.get("/base-data", async (ctx) => {
    const params = ctx.request.query;
    const data = await ReimburService.queryBaseData(params);
    ctx.renderJson({ msg: "查询成功", data });
});

/**
 * 更新报销明细
 */
router.post("/detail/update", async (ctx) => {
    const params = ctx.request.body;
    params.userid = ctx.state.uid;
    await ReimburService.updateDetail(params);
    ctx.renderJson({ msg: "更新成功" });
});

/**
 * 查询关联的采购单
 */
router.get("/purchase/:id", async (ctx) => {
    const data = await ReimburService.queryPurchase(ctx.params.id);
    ctx.renderJson({ msg: "查询关联的采购单", data });
});

/**
 * 获取科目树
 */
router.get("/subject-tree", async (ctx) => {
    const data = await SystemService.getSubjectTree(ctx.token);
    ctx.renderJson({ msg: "查询成功", data });
});

/**
 * 获取银行列表
 */
router.get("/bank-list", async (ctx) => {
    const data = await SystemService.queryBankList();
    ctx.renderJson({ msg: "查询成功", data });
});

export default router;
