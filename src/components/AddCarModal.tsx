import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { CarConfig, ManualGuide, ManualStep, generateCarId } from "@/lib/cars";
import { apiSearchCar } from "@/api";

const CAR_BRANDS = [
  "Acura","Alfa Romeo","Aston Martin","Audi","Bentley","BMW","Bugatti","Buick",
  "Cadillac","Chery","Chevrolet","Chrysler","Citroën","Dacia","Daewoo","Daihatsu",
  "Dodge","DS","Ferrari","Fiat","Ford","Geely","Genesis","GMC","Great Wall",
  "Haval","Honda","Hyundai","Infiniti","Isuzu","Jaguar","Jeep","Kia","Lamborghini",
  "Lancia","Land Rover","Lexus","Lada","Лада","Lincoln","Lotus","Maserati","Mazda",
  "McLaren","Mercedes-Benz","Mini","Mitsubishi","Nissan","Opel","Peugeot","Porsche",
  "RAM","Renault","Rolls-Royce","Saab","SEAT","Skoda","Smart","Subaru","Suzuki",
  "Tesla","Toyota","Vauxhall","Volkswagen","Volvo","Zotye",
  "ВАЗ","УАЗ","UAZ","ГАЗ","GAZ","КАМАЗ","КамАЗ","ЗИЛ","МАЗ","КрАЗ","Урал",
  "Москвич","АЗЛК","ИЖ","Волга","Нива","Буханка",
  "BYD","Changan","Dongfeng","FAW","SAIC","JAC","Lifan","Brilliance","Roewe",
  "MG","Omoda","Exeed","TANK","Jetour","Voyah","Li Auto","NIO","Xpeng","Zeekr",
  "SsangYong","Daihatsu","Hino","Mitsubishi Fuso",
  "Scania","Volvo Trucks","MAN","DAF","Iveco","Renault Trucks","Mercedes-Benz Trucks",
];

const CAR_MODELS: Record<string, string[]> = {
  "Toyota": ["Camry","Corolla","Land Cruiser","Land Cruiser Prado","RAV4","Hilux","Fortuner","Yaris","Auris","Avensis","Highlander","Sequoia","Tundra","Tacoma","4Runner","FJ Cruiser","Venza","Sienna","Alphard","Prius","Celica","Supra","MR2","Carina","Corona","Chaser","Cresta","Mark II","Wish","Ipsum","Estima","Previa","Verso","C-HR","Harrier","Kluger","Blade","Fielder","Premio","Allion","Caldina","Cressida","Soarer","Aristo","Altezza","Verossa","Brevis","Progres","Windom","Voltz","Ist","Urban Cruiser","Rush","Terios","bB","Porte","Spade","Tank","Roomy","Esquire","Noah","Voxy","Granvia"],
  "Volkswagen": ["Polo","Golf","Passat","Tiguan","Touareg","Jetta","Caddy","Transporter","Crafter","Amarok","Sharan","Touran"],
  "BMW": ["3 Series","5 Series","7 Series","X1","X3","X5","X6","X7","1 Series","2 Series","4 Series","6 Series","M3","M5"],
  "Mercedes-Benz": ["C-Class","E-Class","S-Class","GLC","GLE","GLS","A-Class","B-Class","CLA","CLS","G-Class","Sprinter","Vito"],
  "Audi": ["A3","A4","A6","A8","Q3","Q5","Q7","Q8","A5","A7","TT","R8"],
  "Hyundai": ["Solaris","Accent","Elantra","Tucson","Santa Fe","Creta","i30","i40","Sonata","ix35","Palisade","Porter"],
  "Kia": ["Rio","Ceed","Sportage","Sorento","Soul","Stinger","Carnival","Seltos","Telluride","Mohave","K5"],
  "Nissan": ["Almera","Qashqai","X-Trail","Patrol","Navara","Juke","Note","Tiida","Teana","Murano","Pathfinder","Frontier"],
  "Mazda": ["3","6","CX-5","CX-3","CX-9","CX-30","2","MX-5","CX-8"],
  "Honda": ["Civic","Accord","CR-V","HR-V","Pilot","Ridgeline","Jazz","FR-V","Element"],
  "Ford": ["Focus","Mondeo","Explorer","Ranger","F-150","EcoSport","Kuga","Transit","Mustang","Edge","Expedition"],
  "Renault": ["Logan","Sandero","Duster","Megane","Clio","Fluence","Koleos","Kaptur","Arkana","Symbol","Trafic","Master"],
  "Skoda": ["Octavia","Superb","Fabia","Rapid","Kodiaq","Karoq","Scala","Kamiq","Yeti"],
  "Lada": ["Vesta","XRAY","Largus","Granta","Kalina","Priora","Niva","4x4","Samara"],
  "Лада": ["Vesta","XRAY","Largus","Granta","Калина","Приора","Нива","4x4"],
  "ВАЗ": ["2101","2102","2103","2104","2105","2106","2107","2108","2109","21099","2110","2111","2112","2114","2115","Нива 2121"],
  "УАЗ": ["Патриот","Хантер","Буханка","Пикап","3909","452","469","31519","Профи"],
  "UAZ": ["Patriot","Hunter","452","469","Pickup","Profi"],
  "ГАЗ": ["Газель","Газель Next","Газель БИЗНЕС","Соболь","Валдай","ГАЗон","3302","2705","Волга 31105"],
  "GAZ": ["Gazelle","Gazelle Next","Sobol","Valdai"],
  "КАМАЗ": ["5490","5320","43118","65115","65117","6520","4308","65208","Компас"],
  "КамАЗ": ["5490","5320","43118","65115","65117","6520","4308","65208","Компас"],
  "Москвич": ["2140","412","408","2141","3","5"],
  "Mitsubishi": ["Outlander","Pajero","L200","ASX","Eclipse Cross","Galant","Lancer","Carisma","Grandis"],
  "Subaru": ["Forester","Outback","Impreza","Legacy","XV","WRX","BRZ","Tribeca"],
  "Volvo": ["XC90","XC60","XC40","S60","S90","V60","V90"],
  "Peugeot": ["207","208","307","308","407","408","2008","3008","5008","Partner","Boxer"],
  "Citroën": ["C3","C4","C5","Berlingo","Jumper","Jumpy","C-Crosser"],
  "Opel": ["Astra","Vectra","Corsa","Insignia","Mokka","Antara","Zafira","Vivaro","Movano"],
  "Chevrolet": ["Aveo","Cruze","Lacetti","Captiva","Niva","Cobalt","Epica","TrailBlazer","Suburban","Silverado"],
  "Jeep": ["Grand Cherokee","Cherokee","Wrangler","Compass","Renegade","Gladiator"],
  "Land Rover": ["Discovery","Range Rover","Range Rover Sport","Defender","Freelander","Discovery Sport"],
  "Lexus": ["RX","NX","LX","GX","ES","IS","GS","UX","LC"],
  "Infiniti": ["QX80","QX60","QX50","Q50","Q70","FX"],
  "Porsche": ["Cayenne","Macan","Panamera","911","Boxster","Cayman"],
  "Haval": ["F7","Jolion","H6","H9","F7x","Dargo"],
  "Chery": ["Tiggo 4","Tiggo 7","Tiggo 8","Arrizo 5","Arrizo 8"],
  "Geely": ["Atlas","Coolray","Tugella","Emgrand","Okavango"],
  "BYD": ["Han","Tang","Song","Atto 3","Seal","Dolphin"],
  "Changan": ["CS35","CS55","CS75","Eado","UNI-T","UNI-K"],
  "Omoda": ["C5","S5"],
  "Exeed": ["TXL","VX","LX"],
  "MG": ["ZS","HS","RX5","6","4"],
  "Lifan": ["X60","Solano","Smily","X70","Myway"],
  "Scania": ["R","S","G","P","L"],
  "MAN": ["TGX","TGS","TGL","TGM","TGE"],
  "DAF": ["XF","CF","LF"],
  "Iveco": ["Stralis","Daily","Trakker","S-WAY"],
  "Isuzu": ["D-Max","MU-X","NPR","NQR","FRR","ELF"],
  "Hino": ["300","500","700","Dutro","Ranger","Profia"],
};

type Generation = { name: string; years: string };

const CAR_GENERATIONS: Record<string, Record<string, Generation[]>> = {
  "Toyota": {
    "Corolla": [
      { name: "E80", years: "1983–1987" },
      { name: "E90", years: "1987–1992" },
      { name: "E100", years: "1991–1999" },
      { name: "E110", years: "1995–2002" },
      { name: "E120 / E130", years: "2001–2007" },
      { name: "E140 / E150", years: "2006–2013" },
      { name: "E160 / E170", years: "2012–2019" },
      { name: "E210", years: "2018–н.в." },
    ],
    "Camry": [
      { name: "V10", years: "1982–1986" },
      { name: "V20", years: "1986–1991" },
      { name: "V30", years: "1991–1996" },
      { name: "V40", years: "1994–2001" },
      { name: "V50 (XV30)", years: "2001–2006" },
      { name: "V40 (XV40)", years: "2006–2011" },
      { name: "V50 (XV50)", years: "2011–2017" },
      { name: "V70 (XV70)", years: "2017–н.в." },
    ],
    "Land Cruiser": [
      { name: "70 Series", years: "1984–н.в." },
      { name: "80 Series", years: "1990–1998" },
      { name: "100 Series", years: "1998–2007" },
      { name: "200 Series", years: "2007–2021" },
      { name: "300 Series", years: "2021–н.в." },
    ],
    "Land Cruiser Prado": [
      { name: "J70", years: "1984–1996" },
      { name: "J90", years: "1996–2002" },
      { name: "J120", years: "2002–2009" },
      { name: "J150", years: "2009–н.в." },
    ],
    "RAV4": [
      { name: "XA10", years: "1994–2000" },
      { name: "XA20", years: "2000–2005" },
      { name: "XA30", years: "2005–2012" },
      { name: "XA40", years: "2012–2018" },
      { name: "XA50", years: "2018–н.в." },
    ],
    "Hilux": [
      { name: "N50", years: "1978–1983" },
      { name: "N60", years: "1983–1988" },
      { name: "N80", years: "1988–1997" },
      { name: "N100", years: "1997–2005" },
      { name: "N120 / N150", years: "2004–2015" },
      { name: "N210", years: "2015–н.в." },
    ],
    "Celica": [
      { name: "A20/A35", years: "1977–1981" },
      { name: "A40/A50", years: "1981–1985" },
      { name: "A60", years: "1982–1985" },
      { name: "T160", years: "1985–1989" },
      { name: "T180", years: "1989–1993" },
      { name: "T200", years: "1993–1999" },
      { name: "T230", years: "1999–2006" },
    ],
    "Supra": [
      { name: "A60", years: "1981–1986" },
      { name: "A70", years: "1986–1993" },
      { name: "A80", years: "1993–2002" },
      { name: "A90", years: "2019–н.в." },
    ],
    "Mark II": [
      { name: "X60", years: "1984–1988" },
      { name: "X70", years: "1988–1992" },
      { name: "X80", years: "1992–1996" },
      { name: "X90", years: "1996–2000" },
      { name: "X100", years: "1996–2000" },
      { name: "X110", years: "2000–2004" },
    ],
    "Chaser": [
      { name: "X70", years: "1984–1988" },
      { name: "X80", years: "1988–1992" },
      { name: "X90", years: "1992–1996" },
      { name: "X100", years: "1996–2001" },
    ],
    "Harrier": [
      { name: "XU10", years: "1997–2003" },
      { name: "XU30", years: "2003–2013" },
      { name: "ZSU60", years: "2013–2020" },
      { name: "MXUA80", years: "2020–н.в." },
    ],
    "C-HR": [
      { name: "NGX10/ZYX10", years: "2016–н.в." },
    ],
    "Prius": [
      { name: "NHW10", years: "1997–2000" },
      { name: "NHW20", years: "2003–2009" },
      { name: "ZVW30", years: "2009–2015" },
      { name: "ZVW50", years: "2015–2022" },
      { name: "MXWH60", years: "2022–н.в." },
    ],
  },
  "Volkswagen": {
    "Golf": [
      { name: "Golf I", years: "1974–1983" },
      { name: "Golf II", years: "1983–1992" },
      { name: "Golf III", years: "1991–1998" },
      { name: "Golf IV", years: "1997–2006" },
      { name: "Golf V", years: "2003–2009" },
      { name: "Golf VI", years: "2008–2013" },
      { name: "Golf VII", years: "2012–2020" },
      { name: "Golf VIII", years: "2019–н.в." },
    ],
    "Passat": [
      { name: "B3", years: "1988–1993" },
      { name: "B4", years: "1993–1997" },
      { name: "B5", years: "1996–2005" },
      { name: "B6", years: "2005–2010" },
      { name: "B7", years: "2010–2015" },
      { name: "B8", years: "2014–н.в." },
    ],
    "Polo": [
      { name: "Mk3", years: "1994–2002" },
      { name: "Mk4", years: "2001–2009" },
      { name: "Mk5", years: "2009–2017" },
      { name: "Mk6", years: "2017–н.в." },
    ],
    "Tiguan": [
      { name: "Mk1", years: "2007–2016" },
      { name: "Mk2", years: "2016–н.в." },
    ],
  },
  "BMW": {
    "3 Series": [
      { name: "E21", years: "1975–1983" },
      { name: "E30", years: "1982–1994" },
      { name: "E36", years: "1990–2000" },
      { name: "E46", years: "1997–2006" },
      { name: "E90/E91/E92/E93", years: "2004–2013" },
      { name: "F30/F31/F34", years: "2011–2019" },
      { name: "G20/G21", years: "2018–н.в." },
    ],
    "5 Series": [
      { name: "E12", years: "1972–1981" },
      { name: "E28", years: "1981–1988" },
      { name: "E34", years: "1988–1996" },
      { name: "E39", years: "1995–2004" },
      { name: "E60/E61", years: "2003–2010" },
      { name: "F10/F11", years: "2009–2017" },
      { name: "G30/G31", years: "2016–н.в." },
    ],
    "X5": [
      { name: "E53", years: "1999–2006" },
      { name: "E70", years: "2006–2013" },
      { name: "F15", years: "2013–2018" },
      { name: "G05", years: "2018–н.в." },
    ],
  },
  "Mercedes-Benz": {
    "C-Class": [
      { name: "W201 (190)", years: "1982–1993" },
      { name: "W202", years: "1993–2000" },
      { name: "W203", years: "2000–2007" },
      { name: "W204", years: "2007–2014" },
      { name: "W205", years: "2014–2021" },
      { name: "W206", years: "2021–н.в." },
    ],
    "E-Class": [
      { name: "W124", years: "1984–1996" },
      { name: "W210", years: "1995–2003" },
      { name: "W211", years: "2002–2009" },
      { name: "W212", years: "2009–2016" },
      { name: "W213", years: "2016–н.в." },
    ],
  },
  "Hyundai": {
    "Solaris": [
      { name: "I поколение", years: "2010–2017" },
      { name: "II поколение", years: "2017–н.в." },
    ],
    "Creta": [
      { name: "I поколение", years: "2015–2021" },
      { name: "II поколение", years: "2021–н.в." },
    ],
    "Tucson": [
      { name: "JM", years: "2004–2010" },
      { name: "LM", years: "2009–2015" },
      { name: "TL", years: "2015–2020" },
      { name: "NX4", years: "2020–н.в." },
    ],
    "Santa Fe": [
      { name: "SM", years: "2000–2006" },
      { name: "CM", years: "2006–2012" },
      { name: "DM", years: "2012–2018" },
      { name: "TM", years: "2018–н.в." },
    ],
  },
  "Kia": {
    "Rio": [
      { name: "I поколение (DC)", years: "2000–2005" },
      { name: "II поколение (JB)", years: "2005–2011" },
      { name: "III поколение (UB)", years: "2011–2017" },
      { name: "IV поколение (FB)", years: "2017–н.в." },
    ],
    "Sportage": [
      { name: "I поколение", years: "1993–2002" },
      { name: "II поколение (KM)", years: "2004–2010" },
      { name: "III поколение (SL)", years: "2010–2015" },
      { name: "IV поколение (QL)", years: "2015–2021" },
      { name: "V поколение (NQ5)", years: "2021–н.в." },
    ],
  },
  "Nissan": {
    "Almera": [
      { name: "N15", years: "1995–2000" },
      { name: "N16", years: "2000–2006" },
      { name: "G15", years: "2012–2018" },
    ],
    "Qashqai": [
      { name: "J10", years: "2006–2014" },
      { name: "J11", years: "2013–2021" },
      { name: "J12", years: "2021–н.в." },
    ],
    "X-Trail": [
      { name: "T30", years: "2000–2007" },
      { name: "T31", years: "2007–2015" },
      { name: "T32", years: "2013–н.в." },
    ],
    "Patrol": [
      { name: "Y60", years: "1987–1997" },
      { name: "Y61", years: "1997–2013" },
      { name: "Y62", years: "2010–н.в." },
    ],
  },
  "Lada": {
    "Vesta": [
      { name: "I поколение", years: "2015–н.в." },
    ],
    "Granta": [
      { name: "I поколение", years: "2011–2018" },
      { name: "II поколение", years: "2018–н.в." },
    ],
    "Niva": [
      { name: "2121 (классика)", years: "1977–н.в." },
      { name: "Niva Travel", years: "2020–н.в." },
      { name: "Niva Legend", years: "2021–н.в." },
    ],
  },
  "УАЗ": {
    "Патриот": [
      { name: "I поколение", years: "2005–2012" },
      { name: "II поколение", years: "2012–2016" },
      { name: "III поколение", years: "2016–н.в." },
    ],
    "Буханка": [
      { name: "452", years: "1965–н.в." },
    ],
  },
  "ГАЗ": {
    "Газель": [
      { name: "Газель (ГАЗ-3302)", years: "1994–2010" },
      { name: "Газель БИЗНЕС", years: "2010–2015" },
      { name: "Газель Next", years: "2013–н.в." },
      { name: "Газель NN", years: "2022–н.в." },
    ],
  },
  "Ford": {
    "Focus": [
      { name: "Mk1", years: "1998–2004" },
      { name: "Mk2", years: "2004–2011" },
      { name: "Mk3", years: "2010–2018" },
      { name: "Mk4", years: "2018–н.в." },
    ],
    "Mondeo": [
      { name: "Mk1", years: "1993–1996" },
      { name: "Mk2", years: "1996–2000" },
      { name: "Mk3", years: "2000–2007" },
      { name: "Mk4", years: "2007–2014" },
      { name: "Mk5", years: "2014–2022" },
    ],
  },
  "Renault": {
    "Logan": [
      { name: "I поколение", years: "2004–2012" },
      { name: "II поколение", years: "2012–2022" },
      { name: "III поколение", years: "2022–н.в." },
    ],
    "Duster": [
      { name: "I поколение", years: "2010–2017" },
      { name: "II поколение", years: "2017–н.в." },
    ],
  },
  "Skoda": {
    "Octavia": [
      { name: "A4", years: "1996–2010" },
      { name: "A5", years: "2004–2013" },
      { name: "A7", years: "2012–2020" },
      { name: "A8", years: "2019–н.в." },
    ],
  },
  "Mazda": {
    "3": [
      { name: "BK", years: "2003–2009" },
      { name: "BL", years: "2008–2013" },
      { name: "BM / BN", years: "2013–2019" },
      { name: "BP", years: "2019–н.в." },
    ],
    "6": [
      { name: "GG / GY", years: "2002–2008" },
      { name: "GH", years: "2007–2012" },
      { name: "GJ", years: "2012–н.в." },
    ],
    "CX-5": [
      { name: "KE", years: "2011–2017" },
      { name: "KF", years: "2017–н.в." },
    ],
  },
  "Honda": {
    "Civic": [
      { name: "EG/EH", years: "1991–1995" },
      { name: "EK", years: "1995–2001" },
      { name: "EP/EU/ES", years: "2000–2005" },
      { name: "FD/FA/FG", years: "2005–2011" },
      { name: "FB/FG", years: "2011–2015" },
      { name: "FC/FK", years: "2015–2021" },
      { name: "FE/FL", years: "2021–н.в." },
    ],
    "CR-V": [
      { name: "RD", years: "1995–2002" },
      { name: "RD4–RD9", years: "2001–2006" },
      { name: "RE", years: "2006–2012" },
      { name: "RM", years: "2011–2016" },
      { name: "RW/RT", years: "2016–2022" },
      { name: "RS", years: "2022–н.в." },
    ],
  },
  "Mitsubishi": {
    "Outlander": [
      { name: "CU", years: "2001–2006" },
      { name: "CW", years: "2005–2012" },
      { name: "GF/GG", years: "2012–2021" },
      { name: "GN", years: "2021–н.в." },
    ],
    "Pajero": [
      { name: "I поколение", years: "1982–1991" },
      { name: "II поколение", years: "1991–1999" },
      { name: "III поколение", years: "1999–2006" },
      { name: "IV поколение", years: "2006–2021" },
    ],
    "L200": [
      { name: "L040", years: "1978–1986" },
      { name: "L040 II", years: "1986–1996" },
      { name: "K34/K74", years: "1996–2006" },
      { name: "KB4T", years: "2005–2015" },
      { name: "KJ/KK/KL", years: "2015–н.в." },
    ],
  },
};

const CAR_SPECS_URL = "https://functions.poehali.dev/ad7fb5e8-5daf-45c5-9628-b46b7e92ee23";

type Engine = {
  id: string;
  name: string;
  volume: string;
  fuel: string;
  power: string;
};

type Props = {
  onAdd: (car: CarConfig, specs?: [string, string][]) => void;
  onFiltersReady?: (carId: string, guides: ManualGuide[]) => void;
  onClose: () => void;
};

export default function AddCarModal({ onAdd, onFiltersReady, onClose }: Props) {
  const [brand, setBrand] = useState("");
  const [brandSuggestions, setBrandSuggestions] = useState<string[]>([]);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const brandRef = useRef<HTMLDivElement>(null);

  const [model, setModel] = useState("");
  const [modelSuggestions, setModelSuggestions] = useState<string[]>([]);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const modelRef = useRef<HTMLDivElement>(null);

  const [generation, setGeneration] = useState<Generation | null>(null);

  const [year, setYear] = useState("");
  const [interval, setInterval] = useState("");

  const [engines, setEngines] = useState<Engine[]>([]);
  const [selectedEngine, setSelectedEngine] = useState<Engine | null>(null);
  const [enginesLoading, setEnginesLoading] = useState(false);
  const [enginesLoaded, setEnginesLoaded] = useState(false);
  const [enginesError, setEnginesError] = useState("");

  const [specsLoading, setSpecsLoading] = useState(false);
  const [specsLoaded, setSpecsLoaded] = useState(false);
  const [specsError, setSpecsError] = useState("");
  const [aiGuides, setAiGuides] = useState<CarConfig["guides"]>([]);
  const [aiSpecs, setAiSpecs] = useState<[string, string][]>([]);
  const [fromDb, setFromDb] = useState(false);
  const [dbCarId, setDbCarId] = useState<string | null>(null);

  const generations = brand && model ? (CAR_GENERATIONS[brand]?.[model] ?? []) : [];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (brandRef.current && !brandRef.current.contains(e.target as Node)) {
        setShowBrandDropdown(false);
      }
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) {
        setShowModelDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleBrandChange(value: string) {
    setBrand(value);
    resetOnCarChange();
    setModel("");
    setGeneration(null);
    if (value.trim().length > 0) {
      const q = value.toLowerCase();
      const filtered = CAR_BRANDS.filter(b => b.toLowerCase().startsWith(q)).slice(0, 6);
      setBrandSuggestions(filtered);
      setShowBrandDropdown(filtered.length > 0);
    } else {
      setBrandSuggestions([]);
      setShowBrandDropdown(false);
    }
  }

  function selectBrand(b: string) {
    setBrand(b);
    setBrandSuggestions([]);
    setShowBrandDropdown(false);
    resetOnCarChange();
    setModel("");
    setGeneration(null);
  }

  function handleModelChange(value: string) {
    setModel(value);
    setGeneration(null);
    resetOnCarChange();
    if (value.trim().length > 0) {
      const models = CAR_MODELS[brand] ?? [];
      const q = value.toLowerCase();
      const filtered = models.filter(m => m.toLowerCase().startsWith(q)).slice(0, 6);
      setModelSuggestions(filtered);
      setShowModelDropdown(filtered.length > 0);
    } else {
      const models = CAR_MODELS[brand] ?? [];
      setModelSuggestions(models.slice(0, 6));
      setShowModelDropdown(models.length > 0);
    }
  }

  function selectModel(m: string) {
    setModel(m);
    setModelSuggestions([]);
    setShowModelDropdown(false);
    setGeneration(null);
    resetOnCarChange();
  }

  function selectGeneration(g: Generation) {
    setGeneration(g);
    // Автоподставляем год начала поколения
    const startYear = g.years.split("–")[0].trim();
    if (startYear && startYear !== "н.в." && startYear.length === 4) {
      setYear(startYear);
    }
    resetOnCarChange();
  }

  const canFetchEngines = brand.trim().length > 0 && model.trim().length > 0 && year.trim().length === 4;

  function resetOnCarChange() {
    setEnginesLoaded(false);
    setEngines([]);
    setSelectedEngine(null);
    setSpecsLoaded(false);
    setAiSpecs([]);
    setAiGuides([]);
    setInterval("");
    setFromDb(false);
    setDbCarId(null);
  }

  async function handleFetchEngines() {
    setEnginesLoading(true);
    setEnginesError("");
    setEnginesLoaded(false);
    setSelectedEngine(null);
    setSpecsLoaded(false);
    setAiSpecs([]);
    setAiGuides([]);
    setFromDb(false);
    setDbCarId(null);
    try {
      const genName = generation?.name;
      const res = await fetch(CAR_SPECS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: brand.trim(), model: model.trim(), year: year.trim(), mode: "engines", ...(genName ? { generation: genName } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка сервера");
      setEngines(data.engines || []);
      setEnginesLoaded(true);
    } catch (e: unknown) {
      setEnginesError(e instanceof Error ? e.message : "Не удалось получить данные");
    } finally {
      setEnginesLoading(false);
    }
  }

  async function handleFetchSpecs(engine: Engine | null) {
    setSpecsLoading(true);
    setSpecsError("");
    setSpecsLoaded(false);
    setFromDb(false);
    setDbCarId(null);
    try {
      const dbResult = await apiSearchCar(brand.trim(), model.trim(), year.trim());
      if (dbResult.found) {
        setFromDb(true);
        setDbCarId(dbResult.id);
        if (dbResult.oilInterval) setInterval(String(dbResult.oilInterval));
        if (dbResult.guides?.length) setAiGuides(dbResult.guides);
        if (dbResult.specs?.length) setAiSpecs(dbResult.specs);
        setSpecsLoaded(true);
        return;
      }
      const tempId = generateCarId(brand.trim(), model.trim(), year.trim());
      const baseBody = { brand: brand.trim(), model: model.trim(), year: year.trim(), carId: tempId, ...(generation?.name ? { generation: generation.name } : {}) };
      const engineName = engine?.name;
      const body = engineName ? { ...baseBody, engine: engineName } : baseBody;
      const res = await fetch(CAR_SPECS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const specsData = await res.json();
      if (!res.ok) throw new Error(specsData.error || "Ошибка сервера");
      if (specsData.oilInterval) setInterval(String(specsData.oilInterval));
      setAiGuides(specsData.guides || []);
      if (specsData.specs?.length) setAiSpecs(specsData.specs);
      setSpecsLoaded(true);
    } catch (e: unknown) {
      setSpecsError(e instanceof Error ? e.message : "Не удалось получить данные");
    } finally {
      setSpecsLoading(false);
    }
  }

  function handleSelectEngine(engine: Engine) {
    setSelectedEngine(engine);
    handleFetchSpecs(engine);
  }

  async function fetchFiltersInBackground(carId: string, engineName?: string) {
    try {
      const baseBody = { brand: brand.trim(), model: model.trim(), year: year.trim(), carId, ...(generation?.name ? { generation: generation.name } : {}) };
      const body = engineName ? { ...baseBody, engine: engineName, mode: "filters" } : { ...baseBody, mode: "filters" };
      const res = await fetch(CAR_SPECS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      const filterGuides: ManualGuide[] = (data.filters || []).map((f: { id: string; title: string; icon: string; steps: ManualStep[]; article?: string; interval?: string }) => ({
        id: f.id, title: f.title, icon: f.icon, steps: f.steps || [], article: f.article, interval: f.interval,
      }));
      if (filterGuides.length > 0 && onFiltersReady) {
        onFiltersReady(carId, filterGuides);
      }
    } catch (_e) { /* фоновая загрузка */ }
  }

  function handleSubmit() {
    if (!brand.trim() || !model.trim() || !year.trim() || !interval.trim()) return;
    const id = dbCarId ?? generateCarId(brand, model, year);
    const car: CarConfig = {
      id,
      brand: brand.trim(),
      model: model.trim(),
      year: year.trim(),
      engine: selectedEngine?.name,
      oilInterval: Number(interval),
      guides: aiGuides,
      custom: true,
    };
    onAdd(car, aiSpecs.length ? aiSpecs : undefined);
    onClose();
    if (!fromDb) fetchFiltersInBackground(id, selectedEngine?.name);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0">
      <div className="bg-card rounded-3xl border border-border p-6 w-full max-w-sm shadow-xl animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center">
              <Icon name="Car" size={18} className="text-foreground" />
            </div>
            <p className="font-golos font-bold text-foreground text-base">Новый автомобиль</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center hover:bg-muted transition-colors">
            <Icon name="X" size={15} className="text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-3">
          {/* Марка */}
          <div ref={brandRef} className="relative">
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5 block">Марка</label>
            <input
              value={brand}
              onChange={(e) => handleBrandChange(e.target.value)}
              onFocus={() => { if (brandSuggestions.length > 0) setShowBrandDropdown(true); }}
              placeholder="Toyota, УАЗ, Lada..."
              className="w-full bg-secondary rounded-xl px-4 py-3 text-sm font-golos text-foreground placeholder:text-muted-foreground border border-transparent focus:outline-none focus:border-ring transition-colors"
            />
            {showBrandDropdown && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                {brandSuggestions.map((b) => (
                  <button key={b} type="button" onMouseDown={() => selectBrand(b)}
                    className="w-full px-4 py-2.5 text-left text-sm font-golos text-foreground hover:bg-secondary transition-colors">
                    {b}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Модель */}
          <div ref={modelRef} className="relative">
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5 block">Модель</label>
            <input
              value={model}
              onChange={(e) => handleModelChange(e.target.value)}
              onFocus={() => {
                const models = CAR_MODELS[brand] ?? [];
                if (models.length > 0) {
                  const q = model.toLowerCase();
                  const filtered = q ? models.filter(m => m.toLowerCase().startsWith(q)).slice(0, 6) : models.slice(0, 6);
                  setModelSuggestions(filtered);
                  setShowModelDropdown(filtered.length > 0);
                }
              }}
              placeholder="Camry, Патриот, Веста..."
              className="w-full bg-secondary rounded-xl px-4 py-3 text-sm font-golos text-foreground placeholder:text-muted-foreground border border-transparent focus:outline-none focus:border-ring transition-colors"
            />
            {showModelDropdown && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                {modelSuggestions.map((m) => (
                  <button key={m} type="button" onMouseDown={() => selectModel(m)}
                    className="w-full px-4 py-2.5 text-left text-sm font-golos text-foreground hover:bg-secondary transition-colors">
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Поколение */}
          {generations.length > 0 && (
            <div>
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5 block">Поколение</label>
              <div className="flex flex-wrap gap-1.5">
                {generations.map((g) => {
                  const isSelected = generation?.name === g.name;
                  return (
                    <button
                      key={g.name}
                      type="button"
                      onClick={() => selectGeneration(g)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-golos transition-all ${
                        isSelected
                          ? "border-ring bg-ring/10 text-foreground"
                          : "border-border bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <span className="font-medium">{g.name}</span>
                      <span className="ml-1.5 opacity-60">{g.years}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Год и интервал */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5 block">Год</label>
              <input
                value={year} onChange={(e) => { setYear(e.target.value); resetOnCarChange(); }}
                placeholder="2010"
                type="number" min="1900" max="2099"
                className="w-full bg-secondary rounded-xl px-4 py-3 text-sm font-golos text-foreground placeholder:text-muted-foreground border border-transparent focus:outline-none focus:border-ring transition-colors"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5 block">Интервал, км</label>
              <input
                value={interval} onChange={(e) => setInterval(e.target.value)}
                placeholder="7500"
                type="number" min="100"
                className="w-full bg-secondary rounded-xl px-4 py-3 text-sm font-golos text-foreground placeholder:text-muted-foreground border border-transparent focus:outline-none focus:border-ring transition-colors"
              />
            </div>
          </div>

          {!enginesLoaded && (
            <button
              onClick={handleFetchEngines}
              disabled={!canFetchEngines || enginesLoading}
              className="w-full py-3 rounded-xl border border-ring/40 bg-secondary text-sm font-golos font-medium text-foreground flex items-center justify-center gap-2 hover:bg-muted transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              {enginesLoading ? (
                <><Icon name="Loader" size={15} className="animate-spin text-muted-foreground" />Подбираю двигатели...</>
              ) : (
                <><Icon name="Sparkles" size={15} className="text-muted-foreground" />Подобрать двигатель</>
              )}
            </button>
          )}

          {enginesError && <p className="text-xs text-red-500 text-center">{enginesError}</p>}

          {fromDb && enginesLoaded && (
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-2.5">
              <Icon name="Database" size={14} className="text-green-500 shrink-0" />
              <p className="text-xs text-green-600 font-golos">Данные загружены из базы</p>
            </div>
          )}

          {enginesLoaded && engines.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Двигатель</label>
                <button
                  onClick={() => { setEnginesLoaded(false); setSelectedEngine(null); setSpecsLoaded(false); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors font-golos"
                >
                  Сменить
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {engines.map((eng) => {
                  const isSelected = selectedEngine?.id === eng.id;
                  return (
                    <button
                      key={eng.id}
                      onClick={() => handleSelectEngine(eng)}
                      disabled={specsLoading}
                      className={`text-left px-3 py-1.5 rounded-lg border text-xs font-golos transition-all flex items-center gap-1.5 disabled:opacity-50 ${
                        isSelected ? "border-ring bg-ring/10 text-foreground" : "border-border bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <span>{eng.name}</span>
                      {isSelected && specsLoading && <Icon name="Loader" size={11} className="animate-spin text-muted-foreground flex-shrink-0" />}
                      {isSelected && specsLoaded && <Icon name="CheckCircle" size={11} className="text-green-500 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {enginesLoaded && engines.length === 0 && (
            <div className="bg-secondary rounded-xl px-4 py-3 text-sm font-golos text-muted-foreground text-center">
              Двигатели не найдены — введите интервал вручную
            </div>
          )}

          {specsError && <p className="text-xs text-red-500 text-center">{specsError}</p>}

          {specsLoaded && aiSpecs.length > 0 && (
            <div className="bg-secondary rounded-2xl p-3 space-y-1">
              {aiSpecs.map(([key, val]) => (
                <div key={key} className="flex justify-between gap-2 text-xs font-golos">
                  <span className="text-muted-foreground">{key}</span>
                  <span className="text-foreground text-right">{val}</span>
                </div>
              ))}
            </div>
          )}

          {specsLoaded && (
            <div className="flex items-center gap-2 px-1">
              <Icon name="Info" size={13} className="text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground font-golos">Инструкции по фильтрам подгрузятся после добавления</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-secondary text-foreground text-sm font-golos font-medium hover:bg-muted transition-colors">
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={!brand.trim() || !model.trim() || !year.trim() || !interval.trim()}
            className="flex-1 py-3 rounded-xl bg-foreground text-background text-sm font-golos font-semibold hover:opacity-80 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            Добавить
          </button>
        </div>
      </div>
    </div>
  );
}