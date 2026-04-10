import sql from "../../server/db.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      // Fetch aggregate sales data for the Dashboard (Daily, Weekly, Monthly)
      // And the latest transactions
      const recentSales = await sql`
        SELECT s.id, p.sku_id, p.name, s.quantity, s.total_price, s.created_at, s.user_email
        FROM public.sales s
        JOIN public.products p ON s.product_id = p.id
        ORDER BY s.created_at DESC
        LIMIT 20
      `;

      // Aggregate simple metrics
      const dailyResult = await sql`
        SELECT COALESCE(SUM(total_price), 0) as total 
        FROM public.sales 
        WHERE created_at >= CURRENT_DATE
      `;
      
      const weeklyResult = await sql`
        SELECT COALESCE(SUM(total_price), 0) as total 
        FROM public.sales 
        WHERE created_at >= date_trunc('week', CURRENT_DATE)
      `;

      const monthlyResult = await sql`
        SELECT COALESCE(SUM(total_price), 0) as total 
        FROM public.sales 
        WHERE created_at >= date_trunc('month', CURRENT_DATE)
      `;

      return res.status(200).json({ 
        success: true, 
        recentSales,
        stats: {
          daily: Number(dailyResult[0].total),
          weekly: Number(weeklyResult[0].total),
          monthly: Number(monthlyResult[0].total)
        }
      });
    }

    if (req.method === "POST") {
      // Create a new sales log
      // expects { items: [{ sku: 'TP-NEW-...', quantity: 2, price: 100 }], userEmail: "..." }
      const { items, userEmail } = req.body;
      if (!items || items.length === 0) {
        return res.status(400).json({ success: false, error: "No items" });
      }

      await sql.begin(async (tx) => {
        for (const item of items) {
          const pArr = await tx`SELECT id, stocks FROM public.products WHERE sku_id = ${item.sku} OR barcode = ${item.sku} LIMIT 1`;
          if (pArr.length > 0) {
            const product = pArr[0];
            // Deduct stock
            await tx`UPDATE public.products SET stocks = GREATEST(0, stocks - ${item.quantity}) WHERE id = ${product.id}`;
            // Log sale
            await tx`
              INSERT INTO public.sales (product_id, quantity, total_price, user_email)
              VALUES (${product.id}, ${item.quantity}, ${item.price}, ${userEmail || 'Guest'})
            `;
          }
        }
      });

      return res.status(201).json({ success: true });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).json({ success: false, error: "Method not allowed" });
  } catch (err) {
    console.error("Sales Log API Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}
