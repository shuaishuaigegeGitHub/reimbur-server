import Router from "koa-router";
import * as ReimburService from "@/service/ReimburService";

const router = new Router({
    prefix: "/external",
});

/**
 * 买量报销单生成
 */
router.post("/payment-baoxiao-generate", async (ctx) => {
    await ReimburService.paymentBaoXiaoGenerate(ctx.request.body.sign);
    ctx.renderJson({ msg: "报销单生成成功" });
});

export default router;
