import db from "../config/db.js";

export async function saveResults(result) {

  const connection = await db.getConnection();

  try {

    await connection.beginTransaction();

    const { analyzer, sampleId, tests, requestUlid } = result;

    // Insert into analyzer_results
    await connection.execute(
      `INSERT INTO analyzer_results
      (analyzer_code, request_ulid)
      VALUES (?, ?)`,
      [
        analyzer,
        requestUlid
      ]
    );

    // Prepare bulk insert data
    const values = [];

    for (const test of tests) {
      values.push([
        requestUlid,
        analyzer,
        test.testCode,
        test.value,
        test.unit
      ]);
    }

    // Insert into analyzer_result_items
    if (values.length > 0) {
      await connection.query(
        `INSERT INTO analyzer_result_items
        (request_ulid, analyzer_code, analyzer_parameter_code, value, unit)
        VALUES ?`,
        [values]
      );
    }

    await connection.commit();

    return { success: true };

  } catch (error) {

    await connection.rollback();
    console.error("Transaction Error:", error);

    throw error;

  } finally {

    connection.release();

  }
}