// Sample text for Batches 2–5 (sample data only; components never read this).
const ESSAY = [
  "For three summers I worked the night desk at a motel on the coast road, the kind with a pool nobody swam in and a sign that buzzed through the walls. The job was mostly waiting. People arrived late, sunburned and quiet, and asked for rooms facing the water even though every room faced the car park. I learned to hand them the key without a speech. What I remember most is the light: the green of the pool lamps coming up through the blinds, the ice machine glowing like an aquarium, the sky outside never quite finishing its turn to black.",
  "I started taking photographs there because I had nothing else to do with my hands. A cheap camera, a roll a week, pictures of corridors and vending machines and the backs of strangers walking to their cars. None of them were good. But they were accurate, in the way a diary is accurate, and when I look at them now I can smell chlorine and hot concrete and the sweet chemical air of the laundry room.",
  "There is a particular kind of loneliness that belongs to places built for people passing through. It is not unpleasant. It is closer to the feeling of being awake on a long drive while everyone else in the car is asleep: responsible for something, but free. You can think anything at all. The motel gave me that feeling every night, and I did not understand until much later how rare it was to be paid for it.",
  "Online, I have the opposite experience. Nothing is passing through; everything stays. Every photograph I post sits in a feed beside a thousand others, lit from behind, asking to be looked at again. The pictures from the motel were never meant to be seen. They were a way of paying attention, and the attention was the point.",
  "When I moved inland I stopped taking pictures for almost two years. I told myself it was because there was nothing to photograph, which was not true. There was a river, a bridge, a bakery that opened at four in the morning. What I had lost was not the subject but the waiting. My days had filled up. There was no desk, no buzzing sign, no hour between midnight and one when the phone never rang.",
  "I got it back by accident. A friend lent me a car for a week and I drove it to the coast on the last evening, not meaning to stay. The motel was still there. The sign had been replaced with a newer one that did not buzz, and the pool had been filled in and planted with grasses. I sat in the car park with the engine off and watched the blinds in the office go from gold to green as someone inside turned on the lamps.",
  "I do not want to make too much of this. Places change, and it is sentimental to mind. But sitting there I felt the old permission come back, the sense that I was allowed to look at something for as long as I liked without deciding what it meant. I took one photograph through the windscreen. It is out of focus and there is a reflection of my hand in the corner. It is the best picture I have taken.",
  "Since then I have tried to make room for that hour on purpose. It is harder than it sounds. The phone has to go in another room, or in the glovebox, or at the bottom of a bag. The camera has to be one that does not show me the picture straight away, so I cannot check and correct and check again. I have to be willing to come home with nothing.",
  "Most weeks I do come home with nothing, or with pictures that only I will ever care about: a supermarket at closing time, the blue square of a neighbour's television, a heron standing in a flooded field beside the motorway. I print them small and keep them in a shoebox. Sometimes I show them to people, and sometimes I do not.",
  "I think a magazine like this one is a version of the shoebox. It is a place for things made in the offline hour and then, carefully, brought back online long enough to be printed and handed over. The printing matters. A photograph on paper cannot refresh itself. It stays exactly as wrong or as right as it was when it was made.",
  "The last time I drove the coast road the motel had finally closed. The windows were boarded and someone had painted a sunset on the plywood, orange over purple over a flat green sea. It was not very good and I loved it. I took a picture of it, of course. In the picture the painted sun is sharper than the real one going down behind it.",
  "I keep coming back to that image because it seems to contain the whole problem. The painted sun and the real one, the record and the thing. I do not know which one I prefer. I only know that I need an hour a day, or a week, or a season, in which I am not asked to choose. The motel gave me that hour for free, and I have been trying to buy it back ever since, a roll at a time, at the edge of whatever road I happen to be on.",
];
function essay(n, start = 0) {
  const out = []; let c = 0;
  for (let i = 0; i < ESSAY.length && c < n; i++) {
    const sents = ESSAY[(start + i) % ESSAY.length].match(/[^.!?]+[.!?]+/g).map(s => s.trim()); const keep = [];
    for (const s of sents) { const k = s.split(/\s+/).length; if (c + k > n && (keep.length || out.length)) break; keep.push(s); c += k; }
    if (keep.length) out.push(keep.join(' '));
  }
  return out.join('\n\n');
}
const POEM = `the station plays the shipping news
to no one on the western shore,
a voice that reads the wind by name
and asks for nothing more.

I leave it on to fall asleep.
The kettle ticks. The window sweats.
Somewhere a trawler answers back
in numbers and regrets.

Viking, Forties, Cromarty:
I learned them like a second prayer,
the way you learn a stranger's street
by never walking there.

my mother kept the dial between
two stations, so the static sang,
and every night the kitchen filled
with weather and its slang.

now I live inland, by a road
that hums instead of breaking waves,
and still I tune the little set
at midnight, and it saves
some small blue part of me from sleep.

the forecast doesn't change the sea.
it only tells it back, and slow:
moderate, becoming good,
occasionally poor, then low.

I think that's all I want from words,
to say the weather as it is,
to name the water, not to fix
the shape of it, or his,

or mine, or anyone's who sat
up late beside a tinny sound
and felt the whole dark ocean turn
and hold them, and go round.

Sole, Lundy, Fastnet, Irish Sea.
the voice goes on. The kettle cools.
I let the signal wash me out.

and somewhere, faint, a lighthouse keeps
its one word going through the rain,
not asking to be understood,
just saying it again.`;
const LETTERS = [
  { sender_name: 'Ada Lindqvist', subject: 'the ferry photographs', body: "I have been meaning to write since the spring issue arrived. The ferry photographs stopped me on the stairs; I sat down right there with my coat still on. My grandfather worked that crossing for thirty years and never once took a picture of it, so I have only ever seen it in my head. Now I have seen it in yours, blurred exactly the way I imagined, with the lights coming on too early. Thank you for choosing them. I have cut nothing out of the magazine, which is unusual for me, because I want to keep the pages next to each other the way you set them. If there is ever a way to write to the photographer, please tell them that someone on the fourth floor of a building in Malmö is grateful, and that the blur on the left made her laugh out loud on a very bad Tuesday." },
  { sender_name: 'Joaquín Ferro', subject: 'about page nineteen', body: "A small complaint and a large thank you. The complaint: page nineteen has a poem that ends too soon, and I read it four times looking for the rest. The thank you: I have not read anything four times in a very long time. I am a night nurse and I read the issue on my breaks, a page or two at a time, in the room with the broken vending machine. It has made the room better. I don't know how else to say it. Please print more poems that end too soon, and please never tell me how they were supposed to finish." },
  { sender_name: 'Priya Nandakumar', subject: 'a submission, maybe', body: "I am not sure this is the right address for it, but I have been making cyanotypes of the seaweed that washes up after storms and I think they might belong in your pages. They are very blue and a little ugly. I make them on the kitchen floor with the back door open and the neighbours think I am doing something illegal. I will send some in the next submission window if you tell me it is not a silly idea. If it is a silly idea, I will send them anyway, but I will feel worse about it." },
  { sender_name: 'Sam Whitlow', subject: "you asked what we'd like more of", body: "More pictures taken at the wrong time of day. More writing by people who do not usually write. More pages left mostly empty, like the one near the back with only a single small photograph of a bus shelter, which I have looked at more than any other. I think what I want from the magazine is the feeling of being trusted to look slowly. You are already doing it. Keep going, and don't let anyone talk you into making it louder than it needs to be." },
];
const NAMES = ['Maya Okafor', 'Tomás Rehn', 'Ines Varga', 'Ada Lindqvist', 'Joaquín Ferro', 'Priya Nandakumar', 'Sam Whitlow', 'Lena Hoffmann', 'Kofi Mensah', 'Yuki Tanabe', 'Rosa Albright', 'Dev Malhotra', 'Hana Kowalczyk', 'Oluwaseun Adeyemi', 'Clara Duval', 'Mateo Ibarra', 'Freya Holm', 'Amir Haddad', 'June Castellanos', 'Niko Petrov', 'Sade Olatunji', 'Theo Marchetti', 'Ivy Chen', 'Rafael Moreno', 'Elif Aydın', 'Marcus Bell', 'Noor Siddiqui', 'Aoife Brennan', 'Luca Romano', 'Zara Qureshi', 'Felix Laurent', 'Mina Park', 'Omar Farouk', 'Greta Sandvik', 'Ravi Iyer', 'Beatriz Couto', 'Callum Reid', 'Leila Mansour', 'Hugo Brandt', 'Esi Boateng'];
const TITLES = ['Things Seen From Moving Cars', 'Low Tide Almanac', 'The Sea-Green Hour', 'Harbour, After', 'Blue Hour Parking', 'Kitchen Table Prints', 'Notes on Leaving the Lights On', 'Tidewater Radio', 'Night Desk', 'Cyanotypes of Storm Weed', 'The Painted Sun', 'Bus Shelter, Route 9', 'Heron in a Flooded Field', 'Supermarket at Closing', 'Second Pass', 'Letters to the Coast', 'A Shoebox of Small Prints', 'The Long Way Round', 'Pool Lamps', 'Motorway Weather', 'Ice Machine, 2 a.m.', 'Four in the Morning Bakery', 'The Bridge We Never Crossed', 'Glovebox', 'Signal Wash'];
const TYPES = ['Photography', 'Art', 'Essay', 'Poetry'];

Object.assign(window, { ESSAY, essay, POEM, LETTERS, NAMES, TITLES, TYPES });
