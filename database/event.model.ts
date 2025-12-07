import { Schema, model, models, Document, Model } from 'mongoose';

// Strongly typed Event document interface
export interface IEvent extends Document {
  title: string;
  slug: string;
  description: string;
  overview: string;
  image: string;
  venue: string;
  location: string;
  date: string; // stored as ISO 8601 string
  time: string; // stored as HH:mm (24-hour) string
  mode: string;
  audience: string;
  agenda: string[];
  organizer: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Helper to generate a URL-friendly slug from the title
const slugify = (input: string): string => {
  return input
    .toLowerCase()
    .trim()
    .replace(/[_\s]+/g, '-') // replace spaces/underscores with hyphen
    .replace(/[^a-z0-9-]/g, '') // strip non-url-safe chars
    .replace(/-+/g, '-') // collapse multiple hyphens
    .replace(/^-|-$/g, ''); // trim leading/trailing hyphens
};

// Normalize time to HH:mm (24-hour) format; accepts `HH:mm` or `h:mm AM/PM`
const normalizeTime = (input: string): string => {
  const value = input.trim();

  // Already in 24-hour HH:mm
  const twentyFourHour = /^([01]?\d|2[0-3]):([0-5]\d)$/;
  let match = value.match(twentyFourHour);
  if (match) {
    const hour = match[1].padStart(2, '0');
    const minute = match[2];
    return `${hour}:${minute}`;
  }

  // 12-hour format like `1:30 PM`
  const twelveHour = /^(\d{1,2}):([0-5]\d)\s*([AaPp][Mm])$/;
  match = value.match(twelveHour);
  if (match) {
    let hour = parseInt(match[1], 10);
    const minute = match[2];
    const meridiem = match[3].toLowerCase();

    if (hour < 1 || hour > 12) {
      throw new Error('Invalid time: hour must be between 1 and 12 for 12-hour format');
    }

    // Convert to 24-hour clock
    if (meridiem === 'pm' && hour !== 12) {
      hour += 12;
    }
    if (meridiem === 'am' && hour === 12) {
      hour = 0;
    }

    return `${hour.toString().padStart(2, '0')}:${minute}`;
  }

  throw new Error('Invalid time format. Use HH:mm or h:mm AM/PM.');
};

// Event schema definition
const EventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, index: true },
    description: { type: String, required: true, trim: true },
    overview: { type: String, required: true, trim: true },
    image: { type: String, required: true, trim: true },
    venue: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    mode: { type: String, required: true, trim: true },
    audience: { type: String, required: true, trim: true },
    agenda: { type: [String], required: true, default: [] },
    organizer: { type: String, required: true, trim: true },
    tags: { type: [String], required: true, default: [] },
  },
  {
    timestamps: true, // automatically manage createdAt / updatedAt
    strict: true,
  }
);

// Unique index on slug to prevent duplicates
EventSchema.index({ slug: 1 }, { unique: true });

// Pre-save hook: slug generation, date normalization, field validation
EventSchema.pre('save', async function (next): Promise<any> {
  try {
    const event = this as IEvent;

    // Validate required string fields are non-empty (in addition to Mongoose `required`)
    const requiredStringFields: Array<keyof IEvent> = [
      'title',
      'description',
      'overview',
      'image',
      'venue',
      'location',
      'date',
      'time',
      'mode',
      'audience',
      'organizer',
    ];

    for (const field of requiredStringFields) {
      const value = event[field];
      if (typeof value !== 'string' || value.trim().length === 0) {
        return next(new Error(`${field} is required and must be a non-empty string`));
      }
    }

    // Only validate agenda when creating or when agenda changed
    if (event.isNew || event.isModified('agenda')) {
      if (!Array.isArray(event.agenda) || event.agenda.length === 0) {
        return next(new Error('agenda is required and must be a non-empty array'));
      }
    }

    // Only validate tags when creating or when tags changed
    if (event.isNew || event.isModified('tags')) {
      if (!Array.isArray(event.tags) || event.tags.length === 0) {
        return next(new Error('tags is required and must be a non-empty array'));
      }
    }

    // Generate slug only when title changes
    if (event.isModified('title') || !event.slug) {
      event.slug = slugify(event.title);
    }

    // Normalize date to ISO 8601 format only when date changed
    if (event.isModified('date')) {
      const parsedDate = new Date(event.date);
      if (Number.isNaN(parsedDate.getTime())) {
        return next(new Error('Invalid date format; unable to parse date'));
      }
      event.date = parsedDate.toISOString();
    }

    // Normalize time to HH:mm (24-hour) format only when time changed
    if (event.isModified('time')) {
      event.time = normalizeTime(event.time);
    }

    return next();
  } catch (error) {
    return next(error as Error);
  }
});

// Reuse existing model if already compiled (Next.js hot-reload safe)
export const Event: Model<IEvent> =
  (models.Event as Model<IEvent>) || model<IEvent>('Event', EventSchema);
