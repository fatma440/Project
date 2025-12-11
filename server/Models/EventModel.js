import mongoose from "mongoose";

const EventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },

  description: {
    type: String,
    required: true,
  },

  date: {
    type: Date,
    required: true,
  },

  time: {
    type: String,
    required: true,
  },

  locationName: {
    type: String,
    required: true,
  },

  isPublic: {
    type: Boolean,
    default: true,
  },
});

const EventModel = mongoose.model("events", EventSchema);

export default EventModel;
