const panaToDigit = {
  100: 1,
  119: 1,
  128: 1,
  137: 1,
  146: 1,
  236: 1,
  245: 1,
  489: 1,
  579: 1,
  588: 1,
  678: 1,
  155: 1,
  227: 1,
  335: 1,
  344: 1,
  399: 1,
  443: 1,
  669: 1,
  777: 1,
  110: 2,
  129: 2,
  138: 2,
  147: 2,
  156: 2,
  237: 2,
  246: 2,
  255: 2,
  345: 2,
  390: 2,
  480: 2,
  570: 2,
  589: 2,
  679: 2,
  688: 2,
  228: 2,
  444: 2,
  499: 2,
  660: 2,
  778: 2,
  120: 3,
  139: 3,
  148: 3,
  157: 3,
  166: 3,
  238: 3,
  247: 3,
  256: 3,
  346: 3,
  355: 3,
  887: 3,
  599: 3,
  490: 3,
  580: 3,
  670: 3,
  689: 3,
  788: 3,
  111: 3,
  337: 3,
  445: 3,
  130: 4,
  149: 4,
  158: 4,
  167: 4,
  239: 4,
  248: 4,
  257: 4,
  266: 4,
  347: 4,
  356: 4,
  446: 4,
  455: 4,
  590: 4,
  680: 4,
  699: 4,
  789: 4,
  888: 4,
  112: 4,
  220: 4,
  770: 4,
  140: 5,
  159: 5,
  168: 5,
  177: 5,
  230: 5,
  249: 5,
  258: 5,
  267: 5,
  348: 5,
  357: 5,
  366: 5,
  456: 5,
  447: 5,
  555: 5,
  690: 5,
  780: 5,
  799: 5,
  889: 5,
  113: 5,
  221: 5,
  150: 6,
  169: 6,
  178: 6,
  240: 6,
  259: 6,
  268: 6,
  277: 6,
  330: 6,
  349: 6,
  358: 6,
  367: 6,
  457: 6,
  466: 6,
  556: 6,
  114: 6,
  222: 6,
  880: 6,
  899: 6,
  790: 6,
  998: 6,
  160: 7,
  179: 7,
  188: 7,
  250: 7,
  269: 7,
  278: 7,
  340: 7,
  359: 7,
  368: 7,
  377: 7,
  449: 7,
  458: 7,
  467: 7,
  557: 7,
  566: 7,
  115: 7,
  223: 7,
  331: 7,
  999: 7,
  890: 7,
  170: 8,
  189: 8,
  198: 8,
  260: 8,
  279: 8,
  288: 8,
  350: 8,
  369: 8,
  378: 8,
  440: 8,
  459: 8,
  468: 8,
  477: 8,
  558: 8,
  567: 8,
  666: 8,
  116: 8,
  224: 8,
  332: 8,
  990: 8,
  180: 9,
  190: 9,
  270: 9,
  289: 9,
  360: 9,
  379: 9,
  388: 9,
  450: 9,
  469: 9,
  478: 9,
  559: 9,
  568: 9,
  577: 9,
  667: 9,
  117: 9,
  225: 9,
  333: 9,
  441: 9,
  991: 9,
  126: 9,
  280: 0,
  370: 0,
  460: 0,
  550: 0,
  640: 0,
  730: 0,
  820: 0,
  910: 0,
  118: 0,
  226: 0,
  334: 0,
  442: 0,
  668: 0,
  776: 0,
  884: 0,
  992: 0,
  "000": 0,
  578: 0,
};

const panaInput = document.getElementById("panaInput");
const digitInput = document.getElementById("digitInput");
const dropdown = document.getElementById("customDropdown");

const panaList = Object.keys(panaToDigit).sort();

// Function to filter and show dropdown
panaInput.addEventListener("input", function () {
  const val = this.value;
  dropdown.innerHTML = "";

  if (!val) {
    dropdown.classList.add("hidden");
    digitInput.value = "";
    return;
  }

  const filtered = panaList.filter((n) => n.startsWith(val));

  if (filtered.length > 0) {
    dropdown.classList.remove("hidden");
    filtered.forEach((item) => {
      const div = document.createElement("div");
      div.innerHTML = item;
      div.className =
        "p-2 cursor-pointer hover:bg-gray-100 border-b last:border-0";
      div.onclick = function () {
        panaInput.value = item;
        digitInput.value = panaToDigit[item];
        dropdown.classList.add("hidden");
      };
      dropdown.appendChild(div);
    });
  } else {
    dropdown.classList.add("hidden");
  }

  // Auto-fill digit if exact match
  if (panaToDigit.hasOwnProperty(val)) {
    digitInput.value = panaToDigit[val];
  } else {
    digitInput.value = "";
  }
});

// Close dropdown when clicking outside
document.addEventListener("click", function (e) {
  if (!panaInput.contains(e.target) && !dropdown.contains(e.target)) {
    dropdown.classList.add("hidden");
  }
});
