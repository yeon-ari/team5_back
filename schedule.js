const mongoose = require('mongoose');

const schedSchema = mongoose.Schema({
    title: {
        type: String,
        maxlength: 50,
        required: true
    },
    description: {
        type: String,
        maxlength: 100
    },
    day: {
        type: String,
        required: true
    },
    time: {
        type: Number,
        required: true
    },
    type: { // 유동인지 고정인지
        type: Boolean,
        default: "유동"
    },
    attendees: {
        type: String
    },
    location: {
        type: String
    },
    visibility: {
        type: Boolean,
        default: "공개"
    }
})

const Sched = mongoose.model('Sched', schedSchema);
module.exports={ Sched };