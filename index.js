const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;

const { Sched } = require("./schedule");
const { client } = require('./config/db'); 

app.use(express.json());
app.use(bodyParser.json());


app.post('/schedules/add', async(req, res) => {
  try {
    const { title, day, time } = req.body;
    const { description, type, attendees, location, visibility } = req.body;

    if (!title || !day || !time) {
      throw new Error('일정 추가에 필요한 매개변수가 누락되었습니다.');
    }

    // todo database
    await client.connect();
    const db = client.db('schedule');
    const collection = db.collection('user_schedule');
    const document = {
      title: title,
      day: day,
      time: time
    };
    await collection.insertOne(document);
    return res.status(200).json({ message: '일정이 성공적으로 추가되었습니다.' });
  } catch (error) {
    res.status(400).json({ error: '올바르지 않은 요청입니다.', details: error.message });
  }
});

// 공통된 일정 확인
app.post('/findCommonSchedule/:userId/:friendId', async (req, res) => {
  try {
    const db = client.db('schedule');
    const collection1 = db.collection('user_schedule');
    const collection2 = db.collection('friends_schedule');
    const userId = req.params.userId;
    const friendId = req.params.friendId;

    const query1 = { "id": userId };
    const query2 = { "id": friendId };

    const cursor1 = collection1.find(query1); // db에서 사용자 정보 탐색
    const cursor2 = collection2.find(query2);

    const userSchedules = await cursor1.toArray();
    const friendSchedules = await cursor2.toArray();
    
    const commonSchedules = findCommonSchedules(userSchedules, friendSchedules);

    if (commonSchedules.length > 0) {
      res.json({ message: '공통으로 비는 일정이 있습니다.', commonSchedules });
    } else {
      res.json({ message: '공통으로 비는 일정이 없습니다.' });
    }
  } catch (err) {
    res.status(404).json({ "error": '일정을 찾을 수 없습니다.' });
  }
});

// 공통된 일정 찾기
function findCommonSchedules(schedules1, schedules2) {
  const commonSchedules = [];

  for (const schedule1 of schedules1) {
    for (const schedule2 of schedules2) {
      if (schedule1.day === schedule2.day) {
        commonSchedules.push({ day: schedule1.day, time: getCommonTime(schedule1.time, schedule2.time) });
      }
    }
  }
  return commonSchedules;
}

// 시간이 겹치는지 확인
function checkTimeOverlap(time1, time2) {
  const [start1, end1] = time1.split('-').map(item => item.trim());
  const [start2, end2] = time2.split('-').map(item => item.trim());

  // 시간이 겹치는지 확인하는 로직
  const startTime1 = new Date(`2000-01-01T${start1}`);
  const endTime1 = new Date(`2000-01-01T${end1}`);
  const startTime2 = new Date(`2000-01-01T${start2}`);
  const endTime2 = new Date(`2000-01-01T${end2}`);

  // 두 시간대가 겹치는지 확인
  if (startTime1 < endTime2 && endTime1 > startTime2) {
    return false; // 겹치는 경우
  } else {
    return true; // 겹치지 않는 경우
  }
}

function getCommonTime(time1, time2) {
  const [start1, end1] = time1.split('-').map(item => item.trim());
  const [start2, end2] = time2.split('-').map(item => item.trim());

  // mongo db에는 시간이 무조건 00:00 형식으로 입력되어야
  let startTime1 = new Date(`2000-01-01T${start1}`);
  let endTime1 = new Date(`2000-01-01T${end1}`);
  let startTime2 = new Date(`2000-01-01T${start2}`);
  let endTime2 = new Date(`2000-01-01T${end2}`);

  if (startTime1 > startTime2) { // startTime2 가 더 빨리 일어났을 경우
    [startTime1, endTime1, startTime2, endTime2] = [startTime2, endTime2, startTime1, endTime1];
  }

  const commonSchedule = [];
  commonSchedule.push({ start: `2000-01-01T00:00`, end: startTime1});

  if (startTime2 > endTime1) { // 두 사람의 일정 사이에 공백이 존재할 경우
    const intervalStart = endTime1;
    const intervalEnd = startTime2;
    commonSchedule.push({ start: intervalStart, end: intervalEnd});
  }

  commonSchedule.push({ start: endTime2, end: `2000-01-01T00:00`});

  const finalSchedule = [];
  for (let i = 0; i < commonSchedule.length; i++) {
    const formattedStart = new Date(commonSchedule[i].start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedEnd = new Date(commonSchedule[i].end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    finalSchedule.push({ time: `${formattedStart}-${formattedEnd}` });
  }

  return finalSchedule.length > 0 ? finalSchedule : []; // 빈 배열 반환 또는 다른 값 처리
  
}

app.listen(port, () => console.log(`App listening on port ${port}!`));