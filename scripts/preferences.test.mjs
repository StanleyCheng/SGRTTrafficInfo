import test from "node:test";
import assert from "node:assert/strict";
import { PREFERENCE_PREFIX, readPreference, writePreference, isBoolean, isBooleanRecord, isLayerFilters, isMapView, isSavedVehicle, isTransitFilters, pruneTransitFilters } from "../src/lib/preferences.ts";

const store=()=>{const map=new Map();return{getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)};};
test("versioned settings round trip without changing their value or old namespace",()=>{
 const s=store();s.setItem('sgdi.state.v0.layers','broken');writePreference(s,'layers',{bus:true,train:false});
 assert.deepEqual(readPreference(s,'layers',{bus:false,train:false},isBooleanRecord(['bus','train'])),{bus:true,train:false});
});
test("invalid JSON, missing fields and unrecognised layer names fall back safely",()=>{
 const s=store();s.setItem(PREFERENCE_PREFIX+'layers','{broken');assert.equal(readPreference(s,'layers',false,isBoolean),false);
 assert.equal(isBooleanRecord(['bus','train'])({bus:true}),false);
 assert.equal(isBooleanRecord(['bus'])({bus:true,unknown:true}),false);
});
test("denied or full browser storage cannot break app interaction",()=>{
 const denied={getItem:()=>{throw Error('denied');},setItem:()=>{throw Error('quota');}};
 assert.equal(readPreference(denied,'setting',true,isBoolean),true);
 assert.doesNotThrow(()=>writePreference(denied,'setting',false));
});
test("map position permits valid panning beyond Singapore but rejects corrupt camera values",()=>{
 const view={center:[104,1.6],zoom:15.4,bearing:-42,pitch:47};assert.equal(isMapView(view),true);
 for(const invalid of [{...view,zoom:Infinity},{...view,pitch:-1},{...view,center:[0,90]},{...view,bearing:NaN}])assert.equal(isMapView(invalid),false);
});
test("layer and route filters retain explicit all-off and selected-only states",()=>{
 assert.equal(isTransitFilters({bus:[],train:['train:CC'],ferry:null,sentosa:null,cablecar:null,skytrain:null}),true);
 assert.equal(isTransitFilters({bus:'all'}),false);
 assert.equal(isLayerFilters({lotType:'C',plugType:'Type 2',minPowerKw:50,availableOnly:true}),true);
 assert.equal(isLayerFilters({lotType:null,plugType:null,minPowerKw:-1,availableOnly:false}),false);
});
test("expired vehicle snapshots never restore a moving position as current",()=>{
 const now=Date.now(),vehicle={id:'test',routeId:'bus:42:1',service:'42',destination:'Terminal',lineKey:'bus:42',icon:'bus-single-deck',mode:'bus',evidence:'eta',direction:1,
 fromDistance:10,toDistance:100,observedAt:now-1000,arrivalAt:now+10000,staleAt:now+44000,expiresAt:now+89000,serviceStartedAt:now-1000,serviceEndsAt:now+89000};
 assert.equal(isSavedVehicle(vehicle),true);
 assert.equal(isSavedVehicle({...vehicle,expiresAt:now-1,staleAt:now-1}),false);
 assert.equal(isSavedVehicle({...vehicle,expiresAt:now+86400000}),false);
 assert.equal(isSavedVehicle({...vehicle,fromDistance:NaN}),false);
  assert.equal(isSavedVehicle({...vehicle,direction:'1'}),false);
});
test("catalogue changes prune phantom filter IDs without changing all/all-off semantics",()=>{
 const catalog={routes:[{id:'bus:42:1',mode:'bus',service:'42'}]};
 const filters={bus:['bus:42','bus:removed','bus:42'],train:['train:removed'],ferry:null,sentosa:[],cablecar:null,skytrain:null};
 const pruned=pruneTransitFilters(catalog,filters);
 assert.deepEqual(pruned.bus,['bus:42']);assert.deepEqual(pruned.train,[]);assert.equal(pruned.ferry,null);assert.deepEqual(pruned.sentosa,[]);
 assert.equal(pruneTransitFilters(catalog,pruned),pruned);
});
