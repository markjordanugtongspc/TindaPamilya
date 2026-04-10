import sql from "../../server/db.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      // Fetch products logic
      // We will join categories to get the category name if needed
      const products = await sql`
        SELECT p.*, c.name as category_name
        FROM public.products p
        LEFT JOIN public.categories c ON p.category_id = c.id
        ORDER BY p.created_at DESC
      `;
      // Map it to frontend expectations
      const mapped = products.map((p) => ({
        id: p.id,
        sku: p.sku_id,
        barcode: p.barcode,
        name: p.name,
        quantity: p.stocks,
        category: p.category_name || "N/A",
        expirationDate: p.expiration_date,
        salePrice: Number(p.sale_price),
        purchasePrice: Number(p.purchase_price),
        description: p.description,
        image: p.image_url,
        createdAt: p.created_at
      }));
      return res.status(200).json({ success: true, data: mapped });
    }

    if (req.method === "POST") {
      // Add product logic
      const { 
        sku, barcode, name, quantity, category, 
        expirationDate, salePrice, purchasePrice, description, image 
      } = req.body;

      // Ensure category exists or insert if not
      let categoryId = null;
      if (category) {
        let catRows = await sql`SELECT id FROM public.categories WHERE name = ${category} LIMIT 1`;
        if (catRows.length === 0) {
           catRows = await sql`INSERT INTO public.categories (name) VALUES (${category}) RETURNING id`;
        }
        categoryId = catRows[0].id;
      }

      const inserted = await sql`
        INSERT INTO public.products (
          sku_id, barcode, name, stocks, category_id, 
          expiration_date, sale_price, purchase_price, description, image_url
        ) VALUES (
          ${sku}, ${barcode}, ${name}, ${quantity}, ${categoryId},
          ${expirationDate || null}, ${salePrice || 0}, ${purchasePrice || 0}, ${description || null}, ${image || null}
        )
        RETURNING id
      `;

      return res.status(201).json({ success: true, id: inserted[0].id });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).json({ success: false, error: "Method not allowed" });
  } catch (err) {
    console.error("Product API Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}
