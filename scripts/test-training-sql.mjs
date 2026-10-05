import assert from 'node:assert/strict';

export async function testTrainingSQL(db) {
  await db.exec('begin');
  try {
    const { rows: [dates] } = await db.query(`select
      ((now() at time zone 'Asia/Ulaanbaatar')::date + (13 - extract(isodow from now() at time zone 'Asia/Ulaanbaatar')::int))::text as saturday`);
    const saturday = dates.saturday;
    const { rows: [next] } = await db.query('select ($1::date + 1)::text as sunday, ($1::date + 2)::text as monday', [saturday]);
    await db.query('insert into training_sessions(training_date, remaining_seats) values ($1, 1), ($2, 2)', [saturday, next.sunday]);
    const snapshot = (await db.query('select updated_at::text from training_sessions where training_date=$1', [saturday])).rows[0].updated_at;
    const register = (date, key, phone = '99112233') => db.query('select register_scheduled_training($1,$2,$3,$4) as id', ['Training Test', phone, date, key]);
    const failed = async operation => {
      await db.exec('savepoint expected_error');
      await assert.rejects(operation);
      await db.exec('rollback to savepoint expected_error');
    };
    await db.exec('set local role anon');
    const key = '11111111-1111-4111-8111-111111111111';
    const first = (await register(saturday, key)).rows[0].id;
    assert.equal((await register(saturday, key)).rows[0].id, first, 'Retry reuses registration');
    await failed(() => db.query('select * from training_registrations'));
    await failed(() => db.query('update training_sessions set remaining_seats=99'));
    await db.exec('reset role');
    assert.equal((await db.query('select remaining_seats from training_sessions where training_date=$1', [saturday])).rows[0].remaining_seats, 0);
    const stale = await db.query('update training_sessions set remaining_seats=10 where training_date=$1 and updated_at=$2 returning *', [saturday, snapshot]);
    assert.equal(stale.rows.length, 0, 'Stale admin snapshot cannot overwrite a booking');
    await failed(() => register(saturday, '22222222-2222-4222-8222-222222222222'));
    const sundayId = (await register(next.sunday, '33333333-3333-4333-8333-333333333333')).rows[0].id;
    await db.query("update training_registrations set payment_status='paid' where id=$1", [sundayId]);
    assert.equal((await db.query('select remaining_seats from training_sessions where training_date=$1', [next.sunday])).rows[0].remaining_seats, 1, 'Payment callback must not reserve twice');
    await failed(() => db.query('insert into training_sessions(training_date,remaining_seats) values($1,5)', [next.monday]));
    await failed(() => register(next.monday, '44444444-4444-4444-8444-444444444444'));
    await failed(() => db.query('update training_sessions set remaining_seats=-1 where training_date=$1', [next.sunday]));
    await failed(() => db.query('update training_registrations set training_date=$1 where id=$2', [next.sunday, first]));
    await db.query('update training_sessions set is_active=false where training_date=$1', [next.sunday]);
    await failed(() => register(next.sunday, '55555555-5555-4555-8555-555555555555'));
    await db.exec('set local role anon');
    assert.equal((await db.query('select * from training_sessions where training_date=$1', [next.sunday])).rows.length, 0, 'Closed date is not public');
    await db.exec('reset role');
    await db.query('delete from training_registrations where id=$1', [first]);
    assert.equal((await db.query('select remaining_seats from training_sessions where training_date=$1', [saturday])).rows[0].remaining_seats, 1, 'Deleted booking restores its seat');
    assert.equal((await db.query('select remaining_seats from training_sessions where training_date=$1', [next.sunday])).rows[0].remaining_seats, 1, 'Other date stock unaffected');
    await db.query("insert into training_sessions(training_date,remaining_seats) values ('2099-06-07',4) on conflict do nothing");
    const oldSeats = (await db.query("select remaining_seats from training_sessions where training_date='2099-06-07'")).rows[0].remaining_seats;
    await db.query('delete from training_registrations where id=90001');
    assert.equal((await db.query("select remaining_seats from training_sessions where training_date='2099-06-07'")).rows[0].remaining_seats, oldSeats, 'Historical registrations do not restore an unreserved seat');
    console.log('PASS training weekends, Sunday booking, capacity, idempotent retry, payment callback, cancellation, stale admin update and RLS');
  } finally { await db.exec('rollback'); }
}
