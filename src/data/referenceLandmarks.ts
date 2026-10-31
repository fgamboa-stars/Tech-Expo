/**
 * ============================================================================
 * File:        src/data/referenceLandmarks.ts
 * Purpose:     A curated reference set of U.S. historic places with DOCUMENTED
 *              climate-hazard exposure (published assessments and recorded
 *              disasters). It lets the app tell a complete story instantly —
 *              even offline at an expo — before any live GIS analysis runs.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial 33-site reference set (Heritage at Risk v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE — two kinds of evidence:
 * 1. Documented ("reference") evidence: a report or a real event shows the
 *    site is exposed — e.g. the 2017 Sprague Fire burned Sperry Chalet.
 *    Severities here are assigned by reading those sources, and only for the
 *    hazards the sources describe. Every other hazard stays "not assessed".
 * 2. GIS evidence: the Risk Analysis Engine intersects the site's coordinates
 *    with hazard layers. Run it from the State Explorer (one state, live) or
 *    with `npm run analyze` (all National Historic Landmarks). GIS results
 *    replace reference results for the same place.
 * Keeping the two separate — and labeled in the UI — is what makes the
 * findings defensible in front of judges.
 *
 * Coordinates are approximate site centers (WGS84) for display and analysis.
 */
import type { RiskAssessment } from "../types/analysis";
import type { HazardExposure, HazardId, Severity } from "../types/hazard";
import type { Landmark } from "../types/landmark";
import { buildAssessment } from "../analysis/riskScoring";

/** A citation for documented evidence. */
interface Citation {
  source: string;
  url?: string;
}

const UCS: Citation = {
  source: "Union of Concerned Scientists, National Landmarks at Risk (2014)",
  url: "http://www.ucsusa.org/global_warming/science_and_impacts/impacts/national-landmarks-at-risk-from-climate-change.html",
};
const NOAA_SLR: Citation = {
  source: "NOAA 2022 Sea Level Rise Technical Report (10–12 in. average U.S. rise by 2050)",
  url: "https://toolkit.climate.gov/sea-level-rise",
};

/** Raw reference entry: a landmark plus the hazards documented for it. */
interface ReferenceEntry extends Omit<Landmark, "source"> {
  evidence: Partial<Record<HazardId, { severity: Severity; label: string; detail: string; cite: Citation }>>;
}

const ENTRIES: ReferenceEntry[] = [
  {
    id: "ref-jamestown", name: "Historic Jamestowne", state: "VA", city: "Jamestown", lon: -76.7775, lat: 37.2093, isNHL: false,
    significance: "Site of the first permanent English settlement in North America (1607).",
    evidence: {
      slr: { severity: 3, label: "Island sits less than 5 ft above sea level", detail: "UCS reports Jamestown Island could disappear as seas rise; archaeological layers are already being lost to erosion.", cite: UCS },
      flood: { severity: 2, label: "Tidal and storm-surge flooding of the James River shoreline", detail: "Storm surge and high tides already reach the island's archaeological sites.", cite: UCS },
      coastal: { severity: 3, label: "Chesapeake Bay coastal-flood community", detail: "Lower Chesapeake has some of the fastest relative sea-level rise on the Atlantic coast.", cite: NOAA_SLR },
    },
  },
  {
    id: "ref-fort-monroe", name: "Fort Monroe", state: "VA", city: "Hampton", lon: -76.307, lat: 37.0039, isNHL: true,
    significance: "Largest stone fort in the U.S.; 'Freedom's Fortress' for self-emancipated people in 1861.",
    evidence: {
      flood: { severity: 3, label: "Exposed to Chesapeake storm surge and wave action", detail: "UCS lists Fort Monroe among sites repeatedly flooded by storms, including Hurricane Isabel (2003).", cite: UCS },
      slr: { severity: 2, label: "Low-lying peninsula at the mouth of Hampton Roads", detail: "Sea-level rise increases the reach of every storm surge.", cite: UCS },
      coastal: { severity: 3, label: "Hampton Roads coastal-flood community", detail: "Hampton Roads experiences the highest rate of relative sea-level rise on the U.S. East Coast.", cite: NOAA_SLR },
    },
  },
  {
    id: "ref-statue-of-liberty", name: "Statue of Liberty", state: "NY", city: "Liberty Island", lon: -74.0445, lat: 40.6892, isNHL: false,
    significance: "Universal symbol of freedom and democracy; UNESCO World Heritage Site.",
    evidence: {
      flood: { severity: 3, label: "Hurricane Sandy (2012) flooded most of Liberty Island", detail: "Storm surge closed the monument for eight months; UCS lists it as at risk from rising seas.", cite: UCS },
      slr: { severity: 1, label: "Island edges exposed to higher tides", detail: "The statue's pedestal is above projected 2050 tides, but grounds and infrastructure are not.", cite: UCS },
      coastal: { severity: 3, label: "New York Harbor coastal-flood community", detail: "New York Harbor has very high coastal-flood exposure.", cite: NOAA_SLR },
    },
  },
  {
    id: "ref-ellis-island", name: "Ellis Island", state: "NY", city: "New York Harbor", lon: -74.0396, lat: 40.6995, isNHL: false,
    significance: "Gateway for 12 million immigrants between 1892 and 1954.",
    evidence: {
      flood: { severity: 3, label: "Hurricane Sandy flooded the island's buildings", detail: "Surge water destroyed mechanical systems; the collection was moved off-island.", cite: UCS },
      slr: { severity: 2, label: "Built largely on low artificial fill", detail: "Much of the island is landfill only a few feet above high tide.", cite: UCS },
      coastal: { severity: 3, label: "New York Harbor coastal-flood community", detail: "New York Harbor has very high coastal-flood exposure.", cite: NOAA_SLR },
    },
  },
  {
    id: "ref-faneuil-hall", name: "Faneuil Hall", state: "MA", city: "Boston", lon: -71.056, lat: 42.36, isNHL: true,
    significance: "Revolutionary-era meeting hall, the 'Cradle of Liberty'.",
    evidence: {
      flood: { severity: 2, label: "Downtown waterfront floods in nor'easters and king tides", detail: "UCS highlights Boston's historic waterfront, built on filled land, as increasingly flood-prone.", cite: UCS },
      slr: { severity: 2, label: "Built on filled tidal flats", detail: "Higher seas push storm surge further into the historic core.", cite: UCS },
      coastal: { severity: 2, label: "Boston Harbor coastal-flood community", detail: "Boston faces rising coastal-flood frequency.", cite: NOAA_SLR },
    },
  },
  {
    id: "ref-annapolis", name: "Colonial Annapolis Historic District", state: "MD", city: "Annapolis", lon: -76.4922, lat: 38.9784, isNHL: true,
    significance: "One of the best-preserved colonial cities; former U.S. capital (1783–84).",
    evidence: {
      flood: { severity: 3, label: "Frequent high-tide ('nuisance') flooding downtown", detail: "UCS reports high-tide flooding in Annapolis has increased dramatically since the 1950s.", cite: UCS },
      slr: { severity: 2, label: "City Dock area only a few feet above high tide", detail: "Projected rise makes routine tidal flooding of the historic core more frequent.", cite: UCS },
      coastal: { severity: 2, label: "Chesapeake Bay coastal-flood community", detail: "Chesapeake Bay communities face rising coastal-flood frequency.", cite: NOAA_SLR },
    },
  },
  {
    id: "ref-tubman", name: "Harriet Tubman Underground Railroad landscapes", state: "MD", city: "Dorchester County", lon: -76.134, lat: 38.4434, isNHL: false,
    significance: "Landscape where Harriet Tubman was born, enslaved, and began guiding others to freedom.",
    evidence: {
      slr: { severity: 3, label: "Marshes around Blackwater are drowning", detail: "UCS identifies these low Eastern Shore landscapes as among the most threatened by sea-level rise.", cite: UCS },
      flood: { severity: 2, label: "Tidal flooding of roads and fields", detail: "Rising water already cuts off parts of the historic landscape.", cite: UCS },
      coastal: { severity: 2, label: "Eastern Shore coastal-flood community", detail: "Low-lying Chesapeake marshland.", cite: NOAA_SLR },
    },
  },
  {
    id: "ref-cape-hatteras", name: "Cape Hatteras Light Station", state: "NC", city: "Buxton", lon: -75.5288, lat: 35.2508, isNHL: false,
    significance: "Tallest brick lighthouse in the U.S.; moved 2,900 ft inland in 1999 to escape erosion.",
    evidence: {
      flood: { severity: 3, label: "Barrier island overwash and storm surge", detail: "UCS cites the lighthouse's 1999 relocation as an early example of climate adaptation.", cite: UCS },
      slr: { severity: 2, label: "Eroding barrier-island shoreline", detail: "Even after the move, shoreline retreat continues.", cite: UCS },
      coastal: { severity: 3, label: "Outer Banks coastal-flood community", detail: "Outer Banks barrier islands are highly exposed.", cite: NOAA_SLR },
    },
  },
  {
    id: "ref-charleston", name: "Charleston Historic District", state: "SC", city: "Charleston", lon: -79.9311, lat: 32.7765, isNHL: true,
    significance: "Colonial port city with one of the nation's largest collections of historic buildings.",
    evidence: {
      flood: { severity: 3, label: "Record high-tide flooding of the historic peninsula", detail: "UCS reports tidal flooding in Charleston has increased several-fold in recent decades.", cite: UCS },
      slr: { severity: 2, label: "Low peninsula between two rivers", detail: "Much of the historic district is only a few feet above high tide.", cite: UCS },
      coastal: { severity: 3, label: "Charleston Harbor coastal-flood community", detail: "Very high coastal-flood exposure.", cite: NOAA_SLR },
    },
  },
  {
    id: "ref-castillo", name: "Castillo de San Marcos", state: "FL", city: "St. Augustine", lon: -81.3116, lat: 29.898, isNHL: false,
    significance: "Oldest masonry fort in the continental U.S. (1672–1695), in the nation's oldest European-founded city.",
    evidence: {
      flood: { severity: 3, label: "Hurricanes Matthew (2016) and Irma (2017) flooded St. Augustine", detail: "UCS lists St. Augustine among the most threatened historic cities.", cite: UCS },
      slr: { severity: 2, label: "Bayfront historic core near sea level", detail: "Rising seas increase tidal and storm flooding.", cite: UCS },
      coastal: { severity: 3, label: "Matanzas Bay coastal-flood community", detail: "High coastal-flood exposure.", cite: NOAA_SLR },
    },
  },
  {
    id: "ref-lc39a", name: "Launch Complex 39A, Kennedy Space Center", state: "FL", city: "Merritt Island", lon: -80.6041, lat: 28.6083, isNHL: false,
    significance: "Launch pad of Apollo 11 and the Space Shuttle program.",
    evidence: {
      slr: { severity: 2, label: "Pads sit just behind an eroding dune line", detail: "UCS notes more than two-thirds of NASA facilities are within 16 ft of sea level; storms have breached KSC's dunes.", cite: UCS },
      flood: { severity: 2, label: "Storm-surge exposure on the Atlantic barrier", detail: "Shoreline retreat brings the ocean closer to the pads.", cite: UCS },
      coastal: { severity: 3, label: "Space Coast coastal-flood community", detail: "Barrier-island location.", cite: NOAA_SLR },
    },
  },
  {
    id: "ref-fort-jefferson", name: "Fort Jefferson, Dry Tortugas", state: "FL", city: "Garden Key", lon: -82.8732, lat: 24.6285, isNHL: false,
    significance: "Largest all-masonry fort in the Americas, on a tiny key 70 miles west of Key West.",
    evidence: {
      slr: { severity: 3, label: "Low coral key; NPS calls sea-level rise a serious risk", detail: "The National Park Service states sea-level rise and stronger storms threaten the fort's long-term survival.", cite: { source: "National Park Service, Coastal Adaptation Case Studies (Dry Tortugas)", url: "https://www.nps.gov/subjects/climatechange/upload/Coastal-Adaptation-Case-Studies-Chapter5-508.pdf" } },
      flood: { severity: 3, label: "Hurricane Ian (2022) flooded the interior and damaged the moat wall", detail: "Repeated storm damage, including Irma in 2017, has collapsed sections of the moat wall.", cite: { source: "The Weather Channel, 2023 report on Dry Tortugas", url: "https://weather.com/news/climate/news/2023-05-04-dry-tortugas-fort-jefferson-cemetary-hospital" } },
      coastal: { severity: 3, label: "Open-ocean exposure in the Gulf of Mexico", detail: "No barrier protects the key from surge.", cite: NOAA_SLR },
    },
  },
  {
    id: "ref-vizcaya", name: "Vizcaya Museum and Gardens", state: "FL", city: "Miami", lon: -80.2104, lat: 25.7444, isNHL: true,
    significance: "1916 bayfront estate and gardens, a landmark of Gilded Age design.",
    evidence: {
      flood: { severity: 3, label: "Irma (2017) filled the gardens with ~5 ft of saltwater", detail: "The gardens sit about 4 ft above sea level; the museum has installed temporary flood barriers.", cite: { source: "Vizcaya Museum and Gardens", url: "https://vizcaya.org/the-miami-herald-features-vizcaya-and-its-efforts-to-combat-climate-change/" } },
      slr: { severity: 2, label: "Biscayne Bay shoreline gardens 4–5 ft above sea level", detail: "Rising seas raise the base level for every future surge.", cite: { source: "Vizcaya Museum and Gardens", url: "https://vizcaya.org/the-miami-herald-features-vizcaya-and-its-efforts-to-combat-climate-change/" } },
      coastal: { severity: 3, label: "Miami coastal-flood community", detail: "Very high coastal-flood exposure.", cite: NOAA_SLR },
    },
  },
  {
    id: "ref-vieux-carre", name: "Vieux Carré (French Quarter)", state: "LA", city: "New Orleans", lon: -90.0644, lat: 29.9584, isNHL: true,
    significance: "Founded in 1718; the core of New Orleans' Creole architecture and culture.",
    evidence: {
      flood: { severity: 2, label: "Protected by levees, but surrounded by land below sea level", detail: "The Quarter sits on the natural river levee, the city's highest ground — yet still depends on flood walls and pumps.", cite: NOAA_SLR },
      slr: { severity: 2, label: "Gulf Coast faces the nation's fastest relative sea-level rise", detail: "NOAA projects 14–18 inches of rise along the Gulf Coast by 2050, compounded by land subsidence.", cite: NOAA_SLR },
      coastal: { severity: 3, label: "Southeast Louisiana coastal-flood community", detail: "Very high coastal-flood exposure.", cite: NOAA_SLR },
    },
  },
  {
    id: "ref-strand-galveston", name: "The Strand Historic District", state: "TX", city: "Galveston", lon: -94.793, lat: 29.3075, isNHL: true,
    significance: "Victorian commercial district once called the 'Wall Street of the Southwest'.",
    evidence: {
      flood: { severity: 3, label: "Hurricane Ike (2008) surge flooded the district", detail: "The Strand sits on the bay side of Galveston Island, outside the protection of the seawall.", cite: { source: "NOAA National Hurricane Center, Hurricane Ike report (2009)" } },
      slr: { severity: 2, label: "Low barrier island on the Gulf Coast", detail: "NOAA projects 14–18 inches of Gulf Coast rise by 2050.", cite: NOAA_SLR },
      coastal: { severity: 3, label: "Galveston Bay coastal-flood community", detail: "Very high coastal-flood exposure.", cite: NOAA_SLR },
    },
  },
  {
    id: "ref-apollo-mcc", name: "Apollo Mission Control Center", state: "TX", city: "Houston", lon: -95.09, lat: 29.5593, isNHL: true,
    significance: "Where flight controllers guided the Apollo Moon landings.",
    evidence: {
      flood: { severity: 2, label: "Johnson Space Center lies near Clear Lake and Galveston Bay", detail: "UCS lists Johnson Space Center among NASA sites exposed to storm surge.", cite: UCS },
      slr: { severity: 1, label: "Low coastal plain a few miles from the bay", detail: "Surge from a major hurricane could reach the campus.", cite: UCS },
      coastal: { severity: 2, label: "Galveston Bay coastal-flood community", detail: "High coastal-flood exposure.", cite: NOAA_SLR },
    },
  },
  {
    id: "ref-biloxi-light", name: "Biloxi Lighthouse", state: "MS", city: "Biloxi", lon: -88.9019, lat: 30.3946, isNHL: false,
    significance: "1848 cast-iron lighthouse, one of the first in the South.",
    evidence: {
      flood: { severity: 3, label: "Hurricane Katrina's (2005) surge reached the lantern room's base", detail: "The lighthouse stands in the median of the beachfront highway, fully exposed to Gulf surge.", cite: { source: "City of Biloxi; NOAA Hurricane Katrina report" } },
      slr: { severity: 1, label: "Beachfront on the Mississippi Sound", detail: "Gulf Coast rise of 14–18 inches by 2050 raises surge baselines.", cite: NOAA_SLR },
      coastal: { severity: 3, label: "Mississippi Gulf Coast coastal-flood community", detail: "Very high coastal-flood exposure.", cite: NOAA_SLR },
    },
  },
  {
    id: "ref-fort-pulaski", name: "Fort Pulaski", state: "GA", city: "Cockspur Island", lon: -80.8906, lat: 32.0272, isNHL: false,
    significance: "Civil War fort whose 1862 fall proved masonry forts obsolete against rifled cannon.",
    evidence: {
      slr: { severity: 3, label: "NPS expects Cockspur Island to be >50% inundated within 30 years", detail: "The local tide gauge shows about one foot of rise over the past century.", cite: { source: "National Park Service, Fort Pulaski — Climate Change and Hurricanes", url: "https://nps.gov/fopu/learn/historyculture/climate.htm" } },
      flood: { severity: 3, label: "Hurricanes Matthew (2016) and Irma (2017) flooded the island", detail: "A Category 2 storm flooded all of Cockspur Island and closed the park for a month.", cite: { source: "National Park Service, Fort Pulaski — Climate Change and Hurricanes", url: "https://nps.gov/fopu/learn/historyculture/climate.htm" } },
      coastal: { severity: 3, label: "Savannah River mouth coastal-flood community", detail: "Very high coastal-flood exposure.", cite: NOAA_SLR },
    },
  },
  {
    id: "ref-puuhonua", name: "Pu'uhonua o Hōnaunau", state: "HI", city: "Hōnaunau", lon: -155.9105, lat: 19.4217, isNHL: false,
    significance: "Sacred place of refuge for Native Hawaiians who broke kapu (sacred law).",
    evidence: {
      slr: { severity: 2, label: "Shoreline royal grounds and stone walls at the water's edge", detail: "UCS lists Hawai'i Island coastal heritage sites as threatened by sea-level rise.", cite: UCS },
      coastal: { severity: 2, label: "Exposed Kona coastline", detail: "High-wave events and rising seas reach the site.", cite: UCS },
    },
  },
  {
    id: "ref-puukohola", name: "Pu'ukoholā Heiau", state: "HI", city: "Kawaihae", lon: -155.8213, lat: 20.0266, isNHL: true,
    significance: "Temple built by Kamehameha I in 1790–91 on his path to uniting the islands.",
    evidence: {
      slr: { severity: 2, label: "Associated shoreline sites near Kawaihae Bay", detail: "UCS lists the heiau's coastal setting among Hawai'i sites at risk.", cite: UCS },
      coastal: { severity: 2, label: "Kohala coastline exposure", detail: "Rising seas and storm waves.", cite: UCS },
    },
  },
  {
    id: "ref-lahaina", name: "Lahaina Historic District", state: "HI", city: "Lahaina", lon: -156.6781, lat: 20.8723, isNHL: true,
    significance: "Former royal capital of the Hawaiian Kingdom and 19th-century whaling port.",
    evidence: {
      wildfire: { severity: 3, label: "August 2023 wildfire destroyed most of the district", detail: "Of ten contributing structures in the NHL district, two were destroyed outright and seven partly survive.", cite: { source: "Historic Hawai'i Foundation", url: "https://historichawaii.org/?p=34552" } },
      coastal: { severity: 2, label: "Oceanfront Front Street exposed to coastal flooding", detail: "The historic waterfront also faces rising seas and high-wave events.", cite: UCS },
      slr: { severity: 1, label: "Seawall-lined harbor front at the water's edge", detail: "Hawai'i expects 6–8 inches of rise by 2050.", cite: NOAA_SLR },
    },
  },
  {
    id: "ref-mesa-verde", name: "Mesa Verde cliff dwellings", state: "CO", city: "Montezuma County", lon: -108.4733, lat: 37.1678, isNHL: false,
    significance: "Ancestral Puebloan cliff dwellings built 600–1300 CE; UNESCO World Heritage Site.",
    evidence: {
      wildfire: { severity: 3, label: "Large fires burned much of the mesa (2000, 2002)", detail: "UCS reports fires have damaged archaeological sites and exposed others to erosion.", cite: UCS },
      flood: { severity: 1, label: "Post-fire flash flooding and erosion", detail: "Burned slopes shed water and sediment onto sites.", cite: UCS },
    },
  },
  {
    id: "ref-bandelier", name: "Bandelier CCC Historic District", state: "NM", city: "Los Alamos County", lon: -106.2707, lat: 35.7789, isNHL: true,
    significance: "1930s Civilian Conservation Corps buildings beside Ancestral Puebloan dwellings in Frijoles Canyon.",
    evidence: {
      wildfire: { severity: 3, label: "Cerro Grande (2000) and Las Conchas (2011) fires", detail: "UCS describes a one-two punch of wildfire followed by monsoon flash floods.", cite: UCS },
      flood: { severity: 2, label: "Post-fire flash floods in Frijoles Canyon", detail: "Floods after the 2011 fire damaged the visitor area and trails.", cite: UCS },
    },
  },
  {
    id: "ref-los-alamos", name: "Los Alamos Scientific Laboratory", state: "NM", city: "Los Alamos", lon: -106.2981, lat: 35.8812, isNHL: true,
    significance: "Birthplace of the atomic bomb; part of Manhattan Project National Historical Park.",
    evidence: {
      wildfire: { severity: 3, label: "Cerro Grande Fire (2000) burned into the town", detail: "UCS lists Los Alamos among historic places threatened by more frequent large fires.", cite: UCS },
    },
  },
  {
    id: "ref-la-paz", name: "Nuestra Señora Reina de La Paz (César E. Chávez National Monument)", state: "CA", city: "Keene", lon: -118.5622, lat: 35.2244, isNHL: true,
    significance: "Home and headquarters of César Chávez and the United Farm Workers.",
    evidence: {
      wildfire: { severity: 3, label: "Tehachapi foothills chaparral", detail: "UCS lists the monument as threatened by increasing wildfire.", cite: UCS },
    },
  },
  {
    id: "ref-sperry", name: "Sperry Chalet", state: "MT", city: "Glacier National Park", lon: -113.7869, lat: 48.605, isNHL: true,
    significance: "1913 Great Northern Railway backcountry chalet.",
    evidence: {
      wildfire: { severity: 3, label: "Main building destroyed by the Sprague Fire (Aug. 31, 2017)", detail: "Wind pushed the fire over the chalet despite hose lines and sprinklers.", cite: { source: "Missoula Current (2017)", url: "https://missoulacurrent.com/sperry-chalet-destroyed" } },
    },
  },
  {
    id: "ref-big-basin", name: "Big Basin Redwoods State Park Headquarters", state: "CA", city: "Boulder Creek", lon: -122.2223, lat: 37.1724, isNHL: false,
    significance: "1930s CCC-built headquarters of California's oldest state park.",
    evidence: {
      wildfire: { severity: 3, label: "CZU Lightning Complex fire (Aug. 2020) nearly destroyed the headquarters", detail: "The NRHP-listed building was reported almost completely destroyed.", cite: { source: "ARTFIXdaily (2020)", url: "https://artfixdaily.com/news_feed/2020/08/20/3379-wildfire-consumes-historic-core-of-californias-big-basin-state-pa" } },
    },
  },
  {
    id: "ref-hangar-one", name: "Hangar One, Moffett Field", state: "CA", city: "Mountain View", lon: -122.051, lat: 37.4153, isNHL: false,
    significance: "1933 airship hangar, one of the largest freestanding structures in the world; at NASA Ames.",
    evidence: {
      slr: { severity: 2, label: "Bayfront NASA Ames campus on former marshland", detail: "UCS lists NASA Ames among NASA facilities exposed to San Francisco Bay sea-level rise.", cite: UCS },
      flood: { severity: 2, label: "Behind aging bay levees", detail: "Protection depends on levees that rising seas will overtop more often.", cite: UCS },
      coastal: { severity: 2, label: "South San Francisco Bay coastal-flood community", detail: "High coastal-flood exposure.", cite: NOAA_SLR },
    },
  },
  {
    id: "ref-old-faithful-inn", name: "Old Faithful Inn", state: "WY", city: "Yellowstone National Park", lon: -110.8306, lat: 44.4598, isNHL: true,
    significance: "1904 log 'parkitecture' masterpiece, one of the largest log buildings in the world.",
    evidence: {
      wildfire: { severity: 2, label: "1988 North Fork Fire reached the Old Faithful area", detail: "Firefighters saved the inn while nearby cabins burned.", cite: { source: "National Park Service, Yellowstone Fires of 1988" } },
    },
  },
  {
    id: "ref-ellicott-city", name: "Ellicott City Historic District", state: "MD", city: "Ellicott City", lon: -76.7983, lat: 39.2673, isNHL: false,
    significance: "1772 mill town; Main Street holds over 200 historic buildings.",
    evidence: {
      flood: { severity: 3, label: "Two '1,000-year' flash floods in two years (2016, 2018)", detail: "Main Street sits where several streams converge, funneling runoff through the historic district.", cite: { source: "WTOP News (2018)", url: "https://wtop.com/howard-county/2018/05/after-two-disasters-ellicott-city-faces-daunting-flood-control-challenge" } },
    },
  },
  {
    id: "ref-harpers-ferry", name: "Harpers Ferry Historic District", state: "WV", city: "Harpers Ferry", lon: -77.7286, lat: 39.3254, isNHL: false,
    significance: "Site of John Brown's 1859 raid, at the confluence of the Potomac and Shenandoah.",
    evidence: {
      flood: { severity: 3, label: "Repeated major river floods (1870, 1936, 1996)", detail: "The lower town sits in the floodplain of two rivers; heavier downpours raise the stakes.", cite: { source: "National Park Service, Harpers Ferry flood history" } },
    },
  },
  {
    id: "ref-ste-genevieve", name: "Ste. Genevieve Historic District", state: "MO", city: "Ste. Genevieve", lon: -90.0485, lat: 37.9781, isNHL: true,
    significance: "Rare surviving French colonial vertical-log houses (1790s) on the Mississippi.",
    evidence: {
      flood: { severity: 2, label: "Great Flood of 1993 threatened the town", detail: "Emergency levee fights saved the district; the Mississippi floodplain remains mapped as high hazard.", cite: { source: "National Park Service, Ste. Genevieve NHP" } },
    },
  },
  {
    id: "ref-cape-krusenstern", name: "Cape Krusenstern Archeological District", state: "AK", city: "Northwest Arctic Borough", lon: -163.53, lat: 67.43, isNHL: true,
    significance: "114 beach ridges recording 5,000 years of Arctic human history.",
    evidence: {
      coastal: { severity: 3, label: "Storm erosion of beach ridges as sea ice disappears", detail: "UCS reports less sea ice lets fall storms erode the coast, exposing and washing away sites.", cite: UCS },
      slr: { severity: 2, label: "Low beach-ridge complex on the Chukchi Sea", detail: "Northern Alaska expects 8–10 inches of rise by 2050.", cite: NOAA_SLR },
    },
  },
];

/**
 * Converts one reference entry into a scored RiskAssessment.
 * Hazards without documented evidence stay null ("not assessed").
 */
function toAssessment(entry: ReferenceEntry): RiskAssessment {
  const { evidence, ...rest } = entry;
  const landmark: Landmark = { ...rest, source: "reference" };
  const exposures: HazardExposure[] = (Object.keys(evidence) as HazardId[]).map((hazard) => {
    const ev = evidence[hazard]!;
    return {
      hazard,
      severity: ev.severity,
      label: ev.label,
      detail: ev.detail,
      method: "documented",
      source: ev.cite.source,
      sourceUrl: ev.cite.url,
    };
  });
  const assessment = buildAssessment(landmark, exposures);
  // Make "not assessed" explicit for reference entries.
  assessment.exposures = assessment.exposures.map((e) =>
    e.severity === null
      ? { ...e, label: "Not documented in reviewed sources", detail: "Run the live GIS analysis for this state to test this hazard.", method: "documented" }
      : e,
  );
  assessment.analyzedAt = "2026-10-31T00:00:00.000Z";
  return assessment;
}

/** The curated reference assessments, scored with the same model as GIS results. */
export const REFERENCE_ASSESSMENTS: RiskAssessment[] = ENTRIES.map(toAssessment);
