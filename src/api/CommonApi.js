import Router from "koa-router";
import * as CommonSerevice from "@/service/CommonSerevice";

const router = new Router({
    prefix: "/common",
});

/**
 * 图片上传
 */
router.post("/image-upload", async (ctx) => {
    const data = await CommonSerevice.imageUplaod(ctx.request.files.file);
    ctx.renderJson({ msg: "上传成功", data });
});

export default router;
