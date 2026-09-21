import { getStore } from "@netlify/blobs";
import { getUser } from "@netlify/identity";

const store = getStore({
  name: "expense-tracker-users",
  consistency: "strong",
});

function response(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

function isValidExpense(expense) {
  return (
    expense &&
    typeof expense.id === "string" &&
    typeof expense.title === "string" &&
    expense.title.trim().length > 0 &&
    Number.isFinite(Number(expense.amount)) &&
    Number(expense.amount) > 0 &&
    typeof expense.category === "string" &&
    typeof expense.date === "string"
  );
}

export default async function handler(req) {
  try {
    /*
     * IMPORTANT:
     * We get the user from Netlify Identity.
     * The browser cannot choose this user ID.
     */
    const user = await getUser();

    if (!user) {
      return response(
        {
          error: "Unauthorized",
        },
        401,
      );
    }

    /*
     * Each user gets a completely separate key.
     *
     * Example:
     * expenses/USER-A-ID
     * expenses/USER-B-ID
     */
    const key = `expenses/${user.id}`;

    /* =========================
       GET USER EXPENSES
    ========================= */

    if (req.method === "GET") {
      const saved =
        await store.get(
          key,
          {
            type: "json",
          },
        );

      if (!saved) {
        return response({
          expenses: [],
        });
      }

      return response({
        expenses:
          Array.isArray(saved)
            ? saved
            : [],
      });
    }

    /* =========================
       SAVE USER EXPENSES
    ========================= */

    if (req.method === "PUT") {
      const body =
        await req.json();

      if (
        !body ||
        !Array.isArray(
          body.expenses,
        )
      ) {
        return response(
          {
            error:
              "Invalid expenses data.",
          },
          400,
        );
      }

      /*
       * Validate every expense
       * before saving.
       */
      const validExpenses =
        body.expenses.filter(
          isValidExpense,
        );

      if (
        validExpenses.length !==
        body.expenses.length
      ) {
        return response(
          {
            error:
              "One or more expenses are invalid.",
          },
          400,
        );
      }

      /*
       * Prevent extremely large
       * payloads.
       */
      if (
        validExpenses.length >
        5000
      ) {
        return response(
          {
            error:
              "Too many expenses.",
          },
          400,
        );
      }

      await store.setJSON(
        key,
        validExpenses,
      );

      return response({
        success: true,
        count:
          validExpenses.length,
      });
    }

    return response(
      {
        error:
          "Method not allowed.",
      },
      405,
    );
  } catch (error) {
    console.error(
      "Expense function error:",
      error,
    );

    return response(
      {
        error:
          "Server error.",
      },
      500,
    );
  }
}
