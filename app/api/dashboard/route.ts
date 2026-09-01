import { NextResponse } from "next/server";
import { ProductService } from "@/src/modules/product/product.service";

export async function GET() {
  try { return NextResponse.json(await new ProductService().dashboard()); }
  catch (error) { console.error(error); return NextResponse.json({ error: "Dashboard 数据加载失败。" }, { status: 500 }); }
}
