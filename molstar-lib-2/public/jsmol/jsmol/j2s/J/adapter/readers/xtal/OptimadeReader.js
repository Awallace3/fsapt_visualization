Clazz.declarePackage ("J.adapter.readers.xtal");
Clazz.load (["J.adapter.smarter.AtomSetCollectionReader"], "J.adapter.readers.xtal.OptimadeReader", ["java.lang.IllegalArgumentException", "java.util.HashMap", "JU.P3", "$.SB"], function () {
c$ = Clazz.decorateAsClass (function () {
this.modelNo = 0;
this.iHaveDesiredModel = false;
this.dimensionType = null;
this.ndims = 0;
this.isPolymer = false;
this.isSlab = false;
this.xyz = null;
Clazz.instantialize (this, arguments);
}, J.adapter.readers.xtal, "OptimadeReader", J.adapter.smarter.AtomSetCollectionReader);
Clazz.prepareFields (c$, function () {
this.xyz =  Clazz.newFloatArray (3, 0);
});
Clazz.defineMethod (c$, "initializeReader", 
function () {
Clazz.superCall (this, J.adapter.readers.xtal.OptimadeReader, "initializeReader", []);
var sb =  new JU.SB ();
try {
while (this.rd () != null) sb.append (this.line);

var json = this.vwr.parseJSONMap (sb.toString ());
var aData = json.get ("data");
if (aData != null) {
for (var i = 0; !this.iHaveDesiredModel && i < aData.size (); i++) {
var data = aData.get (i);
if ("structures".equals (data.get ("type"))) {
this.readModel (data.get ("attributes"));
}}
}} catch (e) {
if (Clazz.exceptionOf (e, Exception)) {
e.printStackTrace ();
} else {
throw e;
}
}
this.continuing = false;
});
Clazz.defineMethod (c$, "readModel", 
 function (map) {
if (!this.doGetModel (this.modelNumber = ++this.modelNo, null)) return;
this.iHaveDesiredModel = this.isLastModel (this.modelNumber);
this.applySymmetryAndSetTrajectory ();
this.asc.newAtomSet ();
this.setFractionalCoordinates (false);
this.dimensionType =  Clazz.newFloatArray (3, 0);
J.adapter.readers.xtal.OptimadeReader.toFloatArray (map.get ("dimension_types"), this.dimensionType);
if (!this.checkDimensionType ()) {
throw  new IllegalArgumentException ("OptimadeReader does not support dimentionType " + this.dimensionType[0] + " " + this.dimensionType[1] + " " + this.dimensionType[2]);
}if (!this.isMolecular) {
this.setSpaceGroupName ("P1");
this.asc.setInfo ("symmetryType", (this.isSlab ? "2D - SLAB" : this.isPolymer ? "1D - POLYMER" : "3D"));
}this.asc.setAtomSetName (map.get ("chemical_formula_descriptive"));
this.doConvertToFractional = (!this.isMolecular && this.readLattice (map.get ("lattice_vectors")));
this.readAtoms (map.get ("species"), map.get ("species_at_sites"), map.get ("cartesian_site_positions"));
}, "java.util.Map");
Clazz.defineMethod (c$, "checkDimensionType", 
 function () {
var dt = this.dimensionType;
this.isPolymer = this.isSlab = this.isMolecular = false;
this.ndims = dt[0] + dt[1] + dt[2];
return this.ndims == 3 || (this.isMolecular = (this.ndims == 0)) || (this.isSlab = (dt[0] + dt[1] == 2)) || (this.isPolymer = (dt[0] == 1));
});
Clazz.defineMethod (c$, "readLattice", 
 function (lattice) {
if (lattice == null) return false;
var abc =  Clazz.newFloatArray (3, 0);
var vabc =  new Array (3);
for (var i = 0; i < 3; i++) {
if (!J.adapter.readers.xtal.OptimadeReader.toFloatArray (lattice.get (i), this.xyz)) {
return false;
}this.unitCellParams[0] = NaN;
if (this.isSlab || this.isPolymer) {
vabc[i] = JU.P3.new3 (this.xyz[0], this.xyz[1], this.xyz[2]);
abc[i] = vabc[i].length ();
}if (i == 2) {
if (this.isSlab || this.isPolymer) {
this.unitCellParams[0] = abc[0];
if (this.isSlab) this.unitCellParams[1] = abc[1];
}}this.addExplicitLatticeVector (i, this.xyz, 0);
}
this.doApplySymmetry = true;
return true;
}, "java.util.List");
Clazz.defineMethod (c$, "readAtoms", 
 function (species, sites, coords) {
var natoms = sites.size ();
var speciesByName =  new java.util.HashMap ();
for (var i = species.size (); --i >= 0; ) {
var s = species.get (i);
speciesByName.put (s.get ("name"), s);
}
for (var i = 0; i < natoms; i++) {
var sname = sites.get (i);
J.adapter.readers.xtal.OptimadeReader.toFloatArray (coords.get (i), this.xyz);
var sp = speciesByName.get (sname);
var syms = sp.get ("chemical_symbols");
var nOcc = syms.size ();
if (nOcc > 1) {
var conc =  Clazz.newFloatArray (nOcc, 0);
J.adapter.readers.xtal.OptimadeReader.toFloatArray (sp.get ("concentration"), conc);
for (var j = 0; j < conc.length; j++) {
var a = this.addAtom (this.xyz, syms.get (j), sname);
a.foccupancy = conc[j];
}
} else {
this.addAtom (this.xyz, syms.get (0), sname);
}}
}, "java.util.List,java.util.List,java.util.List");
Clazz.defineMethod (c$, "addAtom", 
 function (xyz, sym, name) {
var atom = this.asc.addNewAtom ();
if (sym != null) atom.elementSymbol = sym;
if (name != null) atom.atomName = name;
this.setAtomCoordXYZ (atom, xyz[0], xyz[1], xyz[2]);
return atom;
}, "~A,~S,~S");
c$.toFloatArray = Clazz.defineMethod (c$, "toFloatArray", 
 function (list, a) {
for (var i = a.length; --i >= 0; ) {
var d = list.get (i);
if (d == null) return false;
a[i] = list.get (i).floatValue ();
}
return true;
}, "java.util.List,~A");
});
