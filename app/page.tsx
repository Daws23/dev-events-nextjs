import ExploreBtn from '@/components/ExploreBtn';
import EventCard from '@/components/EventCard';
import events from '@/lib/conf';

export const page = () => {
  return (
    <section>
      <h1 className='text-center'>The hub for Every Dev <br /> Event You Can't Miss</h1>
      <p className='text-center mt-5'>Hackathons, Meetups, and Conferences, All in One Place</p>

      <ExploreBtn />

      <div className='mt-20 space-y-2' >
        <h3>Featured Events</h3>

        <ul className='events list-none'>
          {events.map((event) => (
            <li key={event.title}>
              <EventCard {...event} />
            </li>
          ))}
        </ul>

      </div>
    
    </section>
  )
}

export default page;
