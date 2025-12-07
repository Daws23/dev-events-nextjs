import { Schema, model, models, Document, Model, Types } from 'mongoose';
import { Event } from './event.model';

// Strongly typed Booking document interface
export interface IBooking extends Document {
  eventId: Types.ObjectId;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

// Pragmatic email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Booking schema definition
const BookingSchema = new Schema<IBooking>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true, // index for faster queries by event
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
  },
  {
    timestamps: true, // automatically manage createdAt / updatedAt
    strict: true,
  }
);

// Pre-save hook: validate email and ensure referenced Event exists
BookingSchema.pre('save', async function (next) {
  try {
    const booking = this as IBooking;

    // Validate email format
    if (!emailRegex.test(booking.email)) {
      return next(new Error('Invalid email format'));
    }

    // Verify that the referenced Event exists before saving the booking
    const eventExists = await Event.exists({ _id: booking.eventId });
    if (!eventExists) {
      return next(new Error('Referenced event does not exist'));
    }

    return next();
  } catch (error) {
    return next(error as Error);
  }
});

// Reuse compiled model in dev/hot-reload environments
export const Booking: Model<IBooking> =
  (models.Booking as Model<IBooking>) || model<IBooking>('Booking', BookingSchema);
