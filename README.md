# energy-balancegroup

<a href="https://stromdao.de/" target="_blank" title="STROMDAO - Digital Energy Infrastructure"><img src="./static/stromdao.png" align="right" height="85px" hspace="30px" vspace="30px"></a>

**Digitial Balance Group Management for migrogrids**

[![npm](https://img.shields.io/npm/dt/energy-balancegroup.svg)](https://www.npmjs.com/package/energy-balancegroup)
[![npm](https://img.shields.io/npm/v/energy-balancegroup.svg)](https://www.npmjs.com/package/energy-balancegroup)
[![CircleCI](https://circleci.com/gh/energychain/energy-balancegroup/tree/main.svg?style=svg)](https://circleci.com/gh/energychain/energy-balancegroup/tree/main)
[![CO2Offset](https://api.corrently.io/v2.0/ghgmanage/statusimg?host=energy-balancegroup&svg=1)](https://co2offset.io/badge.html?host=energy-balancegroup)
[![Join the chat at https://gitter.im/stromdao/energy-balancegroup](https://badges.gitter.im/stromdao/energy-balancegroup.svg)](https://gitter.im/stromdao/energy-balancegroup?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/energychain/energy-balancegroup)

## CLI Usage
```
npm install -g energy-balancegroup
energy-balancegroup -h
```

## Core Concepts
Energy-Balance-Group provides a basic data model and schema for energy balancing. Feeds of time series data are taken into a relationship as required for settlements and dispatch recording. The data model takes care of linear interpolation of missing values and keeps track of the latest potential consensus.

The data class provides a replacement of existing physical sensors with a cascade of balances and sub-balances instead of having physical meters/sensors on each level.  


## Node-RED - Sample Flow

Metering Concept of a house with 2 parties (Zinh1, Zinh2), a battery storage (Zbat1), a mains meter (Znap) and a PV-Generator (Zeza1).

```javascript
[{"id":"6fc6b643a5282d6c","type":"tab","label":"Messkonzept - Casa Murus","disabled":false,"info":""},{"id":"653ff7a0b48723ff","type":"Tydids-Receiver","z":"6fc6b643a5282d6c","name":"Znap","address":"0x52E54f5dAE02EFA3EDf3636D89368faF6d4740f1","privateKey":"","x":270,"y":380,"wires":[["29068741873e1036"],[],[],[]]},{"id":"1c3f7c513b1163f1","type":"inject","z":"6fc6b643a5282d6c","name":"setFeedMeta","props":[{"p":"payload"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":true,"onceDelay":0.1,"topic":"_meta","payload":"[{\"feedId\":\"Zinh1_1_8_0\",\"meta\":{\"type\":\"downstream\"}},{\"feedId\":\"Zinh2_1_8_0\",\"meta\":{\"type\":\"downstream\"}},{\"feedId\":\"Zbat1_1_8_0\",\"meta\":{\"type\":\"downstream\"}},{\"feedId\":\"Zbat1_2_8_0\",\"meta\":{\"type\":\"upstream\"}},{\"feedId\":\"Zeza1_2_8_0\",\"meta\":{\"type\":\"upstream\"}},{\"feedId\":\"Znap_1_8_0\",\"meta\":{\"type\":\"upstream\"}},{\"feedId\":\"Znap_2_8_0\",\"meta\":{\"type\":\"downstream\"}}]","payloadType":"json","x":470,"y":200,"wires":[["11083ab967d37b80"]]},{"id":"4010d1d30c7651b6","type":"inject","z":"6fc6b643a5282d6c","name":"Close Balance","props":[{"p":"payload"},{"p":"topic","vt":"str"}],"repeat":"900","crontab":"","once":false,"onceDelay":0.1,"topic":"_ctrl","payload":"close","payloadType":"str","x":460,"y":240,"wires":[["11083ab967d37b80"]]},{"id":"d4153862baef25a2","type":"inject","z":"6fc6b643a5282d6c","name":"Last Balance","props":[{"p":"payload"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"_ctrl","payload":"lastBalance","payloadType":"str","x":470,"y":280,"wires":[["11083ab967d37b80"]]},{"id":"2bad1a25996053f4","type":"comment","z":"6fc6b643a5282d6c","name":"Metering","info":"","x":260,"y":120,"wires":[]},{"id":"7ed4815ab9ecbf23","type":"comment","z":"6fc6b643a5282d6c","name":"Balancing","info":"","x":440,"y":120,"wires":[]},{"id":"9ccb3a78edc8c1b6","type":"debug","z":"6fc6b643a5282d6c","name":"","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"payload","targetType":"msg","statusVal":"","statusType":"auto","x":1110,"y":360,"wires":[]},{"id":"a9b5eeab8ea19e8b","type":"function","z":"6fc6b643a5282d6c","name":"","func":"let balances = [];\nfor(let i=0;(i<4)&&(i<msg.payload.length);i++) {\n    let latest = msg.payload.pop();\n    balances.push(latest);\n    \n}\nmsg.payload = balances;\n\nreturn msg;","outputs":1,"noerr":0,"initialize":"","finalize":"","libs":[],"x":900,"y":360,"wires":[["9ccb3a78edc8c1b6"]]},{"id":"29068741873e1036","type":"function","z":"6fc6b643a5282d6c","name":"Tranform","func":"msg.payload = {\n    Zbat1_1_8_0:msg.payload.Zbat1[\"1.8.0\"],\n    Zbat1_2_8_0:msg.payload.Zbat1[\"2.8.0\"],\n    Zeza1_1_8_0:msg.payload.Zeza1[\"1.8.0\"],\n    Zeza1_2_8_0:msg.payload.Zeza1[\"2.8.0\"],\n    Zinh1_1_8_0:msg.payload.Zinh1[\"1.8.0\"],\n    Zinh1_2_8_0:msg.payload.Zinh1[\"2.8.0\"],\n    Zinh2_1_8_0:msg.payload.Zinh2[\"1.8.0\"],\n    Zinh2_2_8_0:msg.payload.Zinh2[\"2.8.0\"],\n    Znap_1_8_0:msg.payload.Znap[\"1.8.0\"],\n    Znap_2_8_0:msg.payload.Znap[\"2.8.0\"]\n}\nreturn msg;","outputs":1,"noerr":0,"initialize":"","finalize":"","libs":[],"x":460,"y":360,"wires":[["11083ab967d37b80"]]},{"id":"11083ab967d37b80","type":"BalanceGroup","z":"6fc6b643a5282d6c","name":"","x":700,"y":360,"wires":[[],["a9b5eeab8ea19e8b","649adbb9b060aa58"]]},{"id":"649adbb9b060aa58","type":"debug","z":"6fc6b643a5282d6c","name":"","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"true","targetType":"full","statusVal":"","statusType":"auto","x":940,"y":500,"wires":[]}]
```

## Notes

- Adding a new feeder works only for the max_consensus index (no later index)
- Adding a new feeder works via sending a FeedId with addReading

## [CONTRIBUTING](https://github.com/energychain/energy-balancegroup/blob/main/CONTRIBUTING.md)

## [CODE OF CONDUCT](https://github.com/energychain/energy-balancegroup/blob/main/CODE_OF_CONDUCT.md)

## Maintainer / Imprint

<addr>
STROMDAO GmbH  <br/>
Gerhard Weiser Ring 29  <br/>
69256 Mauer  <br/>
Germany  <br/>
  <br/>
+49 6226 968 009 0  <br/>
  <br/>
kontakt@stromdao.com  <br/>
  <br/>
Handelsregister: HRB 728691 (Amtsgericht Mannheim)
</addr>

Project Website: https://tydids.com/

## LICENSE
[Apache-2.0](./LICENSE)
