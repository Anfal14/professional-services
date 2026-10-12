import { bySchedule, type Booking, type BookingStatus } from '@profecian/shared';

/** A job the professional is working right now — the one being done first, then at the door, then travelling to. */
const UNDERWAY: BookingStatus[] = ['in_progress', 'arrived', 'on_the_way'];

export type JobFilter = 'in_progress' | 'upcoming' | 'new' | 'today' | 'completed' | 'cancelled';

export const JOB_FILTER_LABEL: Record<JobFilter, string> = {
  in_progress: 'In progress',
  upcoming: 'Upcoming',
  new: 'Assigned',
  today: 'Today',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

/** Order of the lists on the home screen and the filters on the Jobs tab. */
export const JOB_FILTERS: JobFilter[] = ['in_progress', 'upcoming', 'new', 'today', 'completed', 'cancelled'];

/**
 * A professional's jobs, grouped the same way on the home screen and the Jobs tab.
 * - in_progress: underway now (on the way, arrived or in progress), whatever the date
 * - upcoming: accepted and not started yet, today or later
 * - new: assigned, waiting to be accepted or declined
 * - today: everything scheduled today that is still open (overlaps the three above)
 */
export function groupJobs(mine: Booking[], today: string): Record<JobFilter, Booking[]> {
  return {
    in_progress: mine.filter((b) => UNDERWAY.includes(b.status)).sort((a, b) => UNDERWAY.indexOf(a.status) - UNDERWAY.indexOf(b.status) || bySchedule(a, b)),
    upcoming: mine.filter((b) => b.status === 'accepted').sort(bySchedule),
    new: mine.filter((b) => b.status === 'assigned').sort(bySchedule),
    today: mine.filter((b) => b.date === today && (b.status === 'assigned' || b.status === 'accepted' || UNDERWAY.includes(b.status))).sort(bySchedule),
    completed: mine.filter((b) => b.status === 'completed').sort((a, b) => b.date.localeCompare(a.date)),
    cancelled: mine.filter((b) => b.status === 'cancelled').sort((a, b) => b.date.localeCompare(a.date)),
  };
}
