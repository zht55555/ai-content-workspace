import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ProductService } from "@/src/modules/product/product.service";

export async function GET(request: Request) {
  try { return NextResponse.json(await new ProductService().reviewCenter(Object.fromEntries(new URL(request.url).searchParams))); }
  catch (error) { if (error instanceof ZodError) return NextResponse.json({ error: "筛选条件无效。" }, { status: 400 }); console.error(error); return NextResponse.json({ error: "Review Center 数据加载失败。" }, { status: 500 }); }
}
