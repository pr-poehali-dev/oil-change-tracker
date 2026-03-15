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
  "Toyota": ["Camry","Corolla","Land Cruiser","Land Cruiser Prado","RAV4","Hilux","Fortuner","Yaris","Auris","Avensis","Highlander","Sequoia","Tundra","Tacoma","4Runner","FJ Cruiser","Venza","Sienna","Alphard","Prius"],
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

/*BLOCK_START
  "Toyota": {
    "Corolla": [
      { name: "E80", years: "1983–1987" },
      { name: "E90", years: "1987–1991" },
      { name: "E100", years: "1991–1995" },
      { name: "E110", years: "1995–2002" },
      { name: "E120", years: "2000–2006" },
      { name: "E140/E150", years: "2006–2013" },
      { name: "E170", years: "2013–2019" },
      { name: "E210", years: "2018–н.в." },
    ],
    "Camry": [
      { name: "V10", years: "1982–1986" },
      { name: "V20", years: "1986–1991" },
      { name: "V30", years: "1991–1996" },
      { name: "V40", years: "1996–2001" },
      { name: "V50 (XV30)", years: "2001–2006" },
      { name: "V40 (XV40)", years: "2006–2011" },
      { name: "V50 (XV50)", years: "2011–2017" },
      { name: "V70 (XV70)", years: "2017–н.в." },
    ],
    "Land Cruiser": [
      { name: "FJ40/BJ40", years: "1960–1984" },
      { name: "FJ55", years: "1967–1980" },
      { name: "FJ60/62", years: "1980–1987" },
      { name: "70 Series", years: "1984–н.в." },
      { name: "80 Series", years: "1989–1997" },
      { name: "100 Series", years: "1997–2007" },
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
      { name: "N60/N70", years: "1983–1988" },
      { name: "N80/N90", years: "1988–1997" },
      { name: "N100/N110", years: "1997–2005" },
      { name: "N120/N130", years: "2004–2015" },
      { name: "AN120/AN130", years: "2015–н.в." },
    ],
    "Prius": [
      { name: "NHW10", years: "1997–2000" },
      { name: "NHW20", years: "2003–2009" },
      { name: "ZVW30", years: "2009–2015" },
      { name: "ZVW50", years: "2015–2023" },
      { name: "XW60", years: "2023–н.в." },
    ],
  },
  "Volkswagen": {
    "Golf": [
      { name: "I", years: "1974–1983" },
      { name: "II", years: "1983–1992" },
      { name: "III", years: "1991–1997" },
      { name: "IV", years: "1997–2003" },
      { name: "V", years: "2003–2008" },
      { name: "VI", years: "2008–2013" },
      { name: "VII", years: "2012–2020" },
      { name: "VIII", years: "2019–н.в." },
    ],
    "Passat": [
      { name: "B3", years: "1988–1993" },
      { name: "B4", years: "1993–1997" },
      { name: "B5", years: "1996–2005" },
      { name: "B6", years: "2005–2010" },
      { name: "B7", years: "2010–2014" },
      { name: "B8", years: "2014–н.в." },
    ],
    "Polo": [
      { name: "I", years: "1975–1981" },
      { name: "II", years: "1981–1994" },
      { name: "III", years: "1994–2001" },
      { name: "IV", years: "2001–2009" },
      { name: "V", years: "2009–2017" },
      { name: "VI", years: "2017–н.в." },
    ],
    "Tiguan": [
      { name: "I", years: "2007–2016" },
      { name: "II", years: "2016–н.в." },
    ],
  },
  "BMW": {
    "3 Series": [
      { name: "E21", years: "1975–1983" },
      { name: "E30", years: "1982–1994" },
      { name: "E36", years: "1990–2000" },
      { name: "E46", years: "1997–2006" },
      { name: "E90/E91/E92/E93", years: "2004–2013" },
      { name: "F30/F31/F34/F35", years: "2011–2019" },
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
      { name: "W201", years: "1982–1993" },
      { name: "W202", years: "1993–2000" },
      { name: "W203", years: "2000–2007" },
      { name: "W204", years: "2007–2014" },
      { name: "W205", years: "2014–2021" },
      { name: "W206", years: "2021–н.в." },
    ],
    "E-Class": [
      { name: "W124", years: "1984–1997" },
      { name: "W210", years: "1995–2002" },
      { name: "W211", years: "2002–2009" },
      { name: "W212", years: "2009–2016" },
      { name: "W213", years: "2016–н.в." },
    ],
    "S-Class": [
      { name: "W116", years: "1972–1980" },
      { name: "W126", years: "1979–1991" },
      { name: "W140", years: "1991–1998" },
      { name: "W220", years: "1998–2005" },
      { name: "W221", years: "2005–2013" },
      { name: "W222", years: "2013–2020" },
      { name: "W223", years: "2020–н.в." },
    ],
  },
  "Audi": {
    "A4": [
      { name: "B5", years: "1994–2001" },
      { name: "B6", years: "2000–2004" },
      { name: "B7", years: "2004–2008" },
      { name: "B8", years: "2007–2015" },
      { name: "B9", years: "2015–н.в." },
    ],
    "A6": [
      { name: "C4", years: "1994–1997" },
      { name: "C5", years: "1997–2004" },
      { name: "C6", years: "2004–2011" },
      { name: "C7", years: "2011–2018" },
      { name: "C8", years: "2018–н.в." },
    ],
    "Q5": [
      { name: "8R", years: "2008–2017" },
      { name: "FY", years: "2017–н.в." },
    ],
  },
  "Hyundai": {
    "Solaris": [
      { name: "I (RB)", years: "2010–2017" },
      { name: "II (HC)", years: "2017–н.в." },
    ],
    "Tucson": [
      { name: "I (JM)", years: "2004–2010" },
      { name: "II (LM)", years: "2009–2015" },
      { name: "III (TL)", years: "2015–2020" },
      { name: "IV (NX4)", years: "2020–н.в." },
    ],
    "Santa Fe": [
      { name: "I (SM)", years: "2000–2006" },
      { name: "II (CM)", years: "2006–2012" },
      { name: "III (DM)", years: "2012–2018" },
      { name: "IV (TM)", years: "2018–н.в." },
    ],
    "Elantra": [
      { name: "J1", years: "1990–1995" },
      { name: "XD", years: "2000–2006" },
      { name: "HD", years: "2006–2010" },
      { name: "MD", years: "2010–2016" },
      { name: "AD", years: "2015–2020" },
      { name: "CN7", years: "2020–н.в." },
    ],
  },
  "Kia": {
    "Rio": [
      { name: "I (DC)", years: "2000–2005" },
      { name: "II (JB)", years: "2005–2011" },
      { name: "III (UB)", years: "2011–2017" },
      { name: "IV (FB)", years: "2017–н.в." },
    ],
    "Sportage": [
      { name: "I (JA)", years: "1993–2002" },
      { name: "II (KM)", years: "2004–2010" },
      { name: "III (SL)", years: "2010–2016" },
      { name: "IV (QL)", years: "2016–2021" },
      { name: "V (NQ5)", years: "2021–н.в." },
    ],
  },
  "Nissan": {
    "Almera": [
      { name: "N15", years: "1995–2000" },
      { name: "N16", years: "2000–2006" },
      { name: "G15", years: "2012–2018" },
    ],
    "X-Trail": [
      { name: "T30", years: "2000–2007" },
      { name: "T31", years: "2007–2014" },
      { name: "T32", years: "2013–н.в." },
    ],
    "Qashqai": [
      { name: "J10", years: "2006–2013" },
      { name: "J11", years: "2013–2021" },
      { name: "J12", years: "2021–н.в." },
    ],
    "Patrol": [
      { name: "Y60", years: "1987–1997" },
      { name: "Y61", years: "1997–2013" },
      { name: "Y62", years: "2010–н.в." },
    ],
  },
  "Honda": {
    "Civic": [
      { name: "I", years: "1972–1979" },
      { name: "II", years: "1979–1983" },
      { name: "III", years: "1983–1987" },
      { name: "IV (EF)", years: "1987–1991" },
      { name: "V (EG)", years: "1991–1995" },
      { name: "VI (EK/EJ)", years: "1995–2001" },
      { name: "VII (EU/EP/ES)", years: "2000–2005" },
      { name: "VIII (FD/FA)", years: "2005–2011" },
      { name: "IX (FB/FK)", years: "2011–2015" },
      { name: "X (FC/FK)", years: "2015–2021" },
      { name: "XI (FL)", years: "2021–н.в." },
    ],
    "Accord": [
      { name: "IV (CB)", years: "1989–1993" },
      { name: "V (CD/CE)", years: "1993–1997" },
      { name: "VI (CG/CH/CF)", years: "1997–2002" },
      { name: "VII (CM/CN)", years: "2002–2008" },
      { name: "VIII (CP/CU)", years: "2007–2013" },
      { name: "IX (CR)", years: "2012–2017" },
      { name: "X (CV)", years: "2017–н.в." },
    ],
    "CR-V": [
      { name: "I (RD1)", years: "1995–2001" },
      { name: "II (RD4-RD9)", years: "2001–2006" },
      { name: "III (RE)", years: "2006–2011" },
      { name: "IV (RM)", years: "2011–2016" },
      { name: "V (RW/RT)", years: "2016–2022" },
      { name: "VI", years: "2022–н.в." },
    ],
  },
  "Mazda": {
    "3": [
      { name: "BK", years: "2003–2009" },
      { name: "BL", years: "2008–2013" },
      { name: "BM/BN", years: "2013–2019" },
      { name: "BP", years: "2018–н.в." },
    ],
    "6": [
      { name: "GG/GY", years: "2002–2008" },
      { name: "GH", years: "2007–2012" },
      { name: "GJ", years: "2012–н.в." },
    ],
    "CX-5": [
      { name: "KE", years: "2011–2017" },
      { name: "KF", years: "2017–н.в." },
    ],
  },
  "Ford": {
    "Focus": [
      { name: "I (DAW/DBW)", years: "1998–2004" },
      { name: "II (DA3/DB3)", years: "2004–2011" },
      { name: "III", years: "2010–2019" },
    ],
    "Mondeo": [
      { name: "I (GBP)", years: "1992–1996" },
      { name: "II (BFP)", years: "1996–2000" },
      { name: "III (B4Y/BWY/B5Y)", years: "2000–2007" },
      { name: "IV (BA7)", years: "2007–2014" },
      { name: "V (CD391)", years: "2014–2022" },
    ],
  },
  "Renault": {
    "Logan": [
      { name: "I (LS)", years: "2004–2012" },
      { name: "II", years: "2012–2020" },
      { name: "III", years: "2020–н.в." },
    ],
    "Duster": [
      { name: "I (HS)", years: "2010–2017" },
      { name: "II (HM)", years: "2017–н.в." },
    ],
    "Megane": [
      { name: "I (BA/EA/LA/DA)", years: "1995–2002" },
      { name: "II (BM/CM)", years: "2002–2008" },
      { name: "III (BZ)", years: "2008–2016" },
      { name: "IV (B9A)", years: "2015–н.в." },
    ],
  },
  "Skoda": {
    "Octavia": [
      { name: "I (A4)", years: "1996–2010" },
      { name: "II (A5)", years: "2004–2013" },
      { name: "III (A7)", years: "2012–2020" },
      { name: "IV (NX)", years: "2020–н.в." },
    ],
    "Superb": [
      { name: "I (3U)", years: "2001–2008" },
      { name: "II (3T)", years: "2008–2015" },
      { name: "III (3V)", years: "2015–н.в." },
    ],
  },
  "Mitsubishi": {
    "Outlander": [
      { name: "I (CU)", years: "2001–2006" },
      { name: "II (CW)", years: "2006–2012" },
      { name: "III (GF/GG)", years: "2012–2021" },
      { name: "IV (GN)", years: "2021–н.в." },
    ],
    "Pajero": [
      { name: "I", years: "1982–1991" },
      { name: "II (V20)", years: "1991–1999" },
      { name: "III (V60/V70)", years: "1999–2006" },
      { name: "IV (V80/V90)", years: "2006–н.в." },
    ],
    "Lancer": [
      { name: "IV (C6)", years: "1988–1991" },
      { name: "V (C7)", years: "1991–1995" },
      { name: "VI (C6A)", years: "1995–2000" },
      { name: "VII (CS)", years: "2000–2007" },
      { name: "IX (CS9A)", years: "2003–2009" },
      { name: "X (CY/CZ)", years: "2007–2017" },
    ],
  },
  "Subaru": {
    "Forester": [
      { name: "I (SF)", years: "1997–2002" },
      { name: "II (SG)", years: "2002–2007" },
      { name: "III (SH)", years: "2007–2013" },
      { name: "IV (SJ)", years: "2012–2018" },
      { name: "V (SK)", years: "2018–н.в." },
    ],
    "Outback": [
      { name: "I (BG)", years: "1994–1999" },
      { name: "II (BE/BH)", years: "1999–2003" },
      { name: "III (BP/BL)", years: "2003–2009" },
      { name: "IV (BR/BM)", years: "2009–2014" },
      { name: "V (BS/BN)", years: "2014–2020" },
      { name: "VI (BT)", years: "2020–н.в." },
    ],
    "Impreza": [
      { name: "I (GC/GF)", years: "1992–2000" },
      { name: "II (GD/GG)", years: "2000–2007" },
      { name: "III (GH/GE)", years: "2007–2011" },
      { name: "IV (GP/GJ)", years: "2011–2016" },
      { name: "V (GT/GK)", years: "2016–н.в." },
    ],
  },
  "Opel": {
    "Astra": [
      { name: "F", years: "1991–2002" },
      { name: "G", years: "1998–2009" },
      { name: "H", years: "2004–2014" },
      { name: "J", years: "2009–2019" },
      { name: "K", years: "2015–2022" },
      { name: "L", years: "2021–н.в." },
    ],
    "Vectra": [
      { name: "A", years: "1988–1995" },
      { name: "B", years: "1995–2002" },
      { name: "C", years: "2002–2009" },
    ],
  },
  "Chevrolet": {
    "Lacetti": [
      { name: "J200", years: "2002–2013" },
    ],
    "Cruze": [
      { name: "J300", years: "2008–2016" },
      { name: "J400", years: "2015–2019" },
    ],
    "Captiva": [
      { name: "C100", years: "2006–2011" },
      { name: "C140", years: "2011–2018" },
    ],
  },
  "УАЗ": {
    "Патриот": [
      { name: "I", years: "2005–2014" },
      { name: "II (рестайлинг)", years: "2014–2016" },
      { name: "III (рестайлинг)", years: "2016–2019" },
      { name: "IV (рестайлинг)", years: "2019–н.в." },
    ],
    "Хантер": [
      { name: "469 (исходный)", years: "1972–2003" },
      { name: "Хантер", years: "2003–н.в." },
    ],
  },
  "ВАЗ": {
    "2110": [
      { name: "ВАЗ-2110", years: "1995–2014" },
    ],
    "Нива 2121": [
      { name: "21213", years: "1994–2006" },
      { name: "21214", years: "2006–н.в." },
    ],
  },
  "Lada": {
    "Vesta": [
      { name: "I", years: "2015–2022" },
      { name: "I рестайлинг", years: "2022–н.в." },
    ],
    "Granta": [
      { name: "I (2190)", years: "2011–2018" },
      { name: "II рестайлинг", years: "2018–н.в." },
    ],
    "XRAY": [
      { name: "I", years: "2015–н.в." },
    ],
  },
  "Peugeot": {
    "307": [
      { name: "I", years: "2001–2005" },
      { name: "I рестайлинг", years: "2005–2008" },
    ],
    "308": [
      { name: "I (T7)", years: "2007–2013" },
      { name: "II (T9)", years: "2013–2021" },
      { name: "III (P51)", years: "2021–н.в." },
    ],
  },
  "Land Rover": {
    "Discovery": [
      { name: "I (LJ/LG)", years: "1989–1998" },
      { name: "II (LT)", years: "1998–2004" },
      { name: "III (L319)", years: "2004–2009" },
      { name: "IV (L319)", years: "2009–2016" },
      { name: "V (L462)", years: "2016–н.в." },
    ],
    "Defender": [
      { name: "I (L316)", years: "1983–2016" },
      { name: "II (L663)", years: "2019–н.в." },
    ],
    "Range Rover": [
      { name: "I", years: "1969–1996" },
      { name: "II (P38A)", years: "1994–2002" },
      { name: "III (L322)", years: "2002–2012" },
      { name: "IV (L405)", years: "2012–2022" },
      { name: "V (L460)", years: "2021–н.в." },
    ],
  },
  "Lexus": {
    "RX": [
      { name: "I (XU10)", years: "1997–2003" },
      { name: "II (XU30)", years: "2003–2009" },
      { name: "III (AL10)", years: "2008–2015" },
      { name: "IV (AL20)", years: "2015–2022" },
      { name: "V (AL30)", years: "2022–н.в." },
    ],
    "LX": [
      { name: "450 (J80)", years: "1996–1997" },
      { name: "470 (J100)", years: "1998–2007" },
      { name: "570 (J200)", years: "2007–2021" },
      { name: "600 (J300)", years: "2021–н.в." },
    ],
  },
  "Jeep": {
    "Grand Cherokee": [
      { name: "ZJ", years: "1992–1998" },
      { name: "WJ", years: "1998–2004" },
      { name: "WK", years: "2004–2010" },
      { name: "WK2", years: "2010–2021" },
      { name: "WL", years: "2021–н.в." },
    ],
    "Wrangler": [
      { name: "YJ", years: "1986–1995" },
      { name: "TJ", years: "1996–2006" },
      { name: "JK", years: "2006–2018" },
      { name: "JL", years: "2018–н.в." },
    ],
  },
}; BLOCK_END*/

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
      const baseBody = { brand: brand.trim(), model: model.trim(), year: year.trim(), ...(generation?.name ? { generation: generation.name } : {}) };
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
      const baseBody = { brand: brand.trim(), model: model.trim(), year: year.trim(), ...(generation?.name ? { generation: generation.name } : {}) };
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