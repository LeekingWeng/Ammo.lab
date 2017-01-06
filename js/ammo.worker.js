/**   _   _____ _   _   
*    | | |_   _| |_| |
*    | |_ _| | |  _  |
*    |___|_|_| |_| |_|
*    @author lo.th / http://lo-th.github.io/labs/
*    AMMO worker ultimate
*
*    By default, Bullet assumes units to be in meters and time in seconds. 
*    Moving objects are assumed to be in the range of 0.05 units, about the size of a pebble, 
*    to 10, the size of a truck. 
*    The simulation steps in fraction of seconds (1/60 sec or 60 hertz), 
*    and gravity in meters per square second (9.8 m/s^2).
*/

'use strict';

var Module = { TOTAL_MEMORY: 256*1024*1024 };
//var Module = { TOTAL_MEMORY: 256*1024*1024 };
//var Module = { TOTAL_MEMORY: 256*1024*1024 };
//var isFirst = true;

var trans, pos, quat, posW, quatW, transW, gravity;
var tmpTrans, tmpPos, tmpQuat;
var tmpPos1, tmpPos2, tmpPos3, tmpPos4;
var tmpTrans1, tmpTrans2;

// forces
var tmpForce = [];//null;

// kinematic
var tmpMatrix = [];

//var tmpset = null;

// array
var bodys, softs, joints, cars, solids, heros, carsInfo;
// object
var byName;

var timeStep = 1/60;
var timerStep = timeStep * 1000;

var substep = 2;//4//3;// default is 1. 2 or more make simulation more accurate.
var ddt = 1;
var key = [ 0,0,0,0,0,0,0,0 ];
var tmpKey = [ 0,0,0,0,0,0,0,0 ];

var pause = true;

//var timer = 0;
var isBuffer, isDynamic;



var currentCar = 0;

// main transphere array
var Br, Cr, Jr, Hr, Sr;

var fixedTime = 0.01667;
var last_step = Date.now();
var timePassed = 0;

var STATE = {
    ACTIVE : 1,
    ISLAND_SLEEPING : 2,
    WANTS_DEACTIVATION : 3,
    DISABLE_DEACTIVATION : 4,
    DISABLE_SIMULATION : 5
}

var FLAGS = {
    STATIC_OBJECT : 1,
    KINEMATIC_OBJECT : 2,
    NO_CONTACT_RESPONSE : 4,
    CUSTOM_MATERIAL_CALLBACK : 8,
    CHARACTER_OBJECT : 16,
    DISABLE_VISUALIZE_OBJECT : 32,
    DISABLE_SPU_COLLISION_PROCESSING : 64 
};

var GROUP = { 
    DEFAULT : 1, 
    STATIC : 2, 
    KINEMATIC : 4, 
    DEBRIS : 8, 
    SENSORTRIGGER : 16, 
    NOCOLLISION : 32,
    GROUP0 : 64,
    GROUP1 : 128,
    GROUP2 : 256,
    GROUP3 : 512,
    GROUP4 : 1024,
    GROUP5 : 2048,
    GROUP6 : 4096,
    GROUP7 : 8192,
    ALL : -1 
}


function initARRAY(){

    Br = new Float32Array( 1000*8 ); // rigid buffer max 1000
    Cr = new Float32Array( 14*56 ); // car buffer max 14 / 6 wheels
    Jr = new Float32Array( 100*4 ); // joint buffer max 100
    Hr = new Float32Array( 10*8 ); // hero buffer max 10
    Sr = new Float32Array( 8192*3 );// soft buffer nVertices x,y,z


    /*Br = new Float32Array( new ArrayBuffer(1000*8) ); // rigid buffer max 1000
    Cr = new Float32Array( new ArrayBuffer(14*56) ); // car buffer max 14 / 6 wheels
    Jr = new Float32Array( new ArrayBuffer(100*4) ); // joint buffer max 100
    Hr = new Float32Array( new ArrayBuffer(10*8) ); // hero buffer max 10
    Sr = new Float32Array( new ArrayBuffer(8192*3) );*/

};

 function dynamicARRAY(){

    Br = new Float32Array( bodys.length*8 ); // rigid buffer max 1000
    Cr = new Float32Array( cars.length*56 ); // car buffer max 14 / 6 wheels
    Jr = new Float32Array( joints.length*4 ); // joint buffer max 100
    Hr = new Float32Array( heros.length*8 ); // hero buffer max 10

    var p = 0;
    softs.forEach( function ( b ) { p += b.points; });
    Sr = new Float32Array( p*3 );// soft buffer nVertices x,y,z

    
    //Sr = new Float32Array( 8192*3 );


};

/*function stepAdvanced () {

    var time = Date.now();
    var seconds = ( time - last_step ) * 0.001;
    last_step = time;

    var maxSubSteps = 1;
    var fixedtimeStep = seconds;

    timePassed += seconds;
    //timeStep < maxSubSteps * fixedtimeStep

    if ( timePassed >= fixedTime ) {
        maxSubSteps = ~~ ( seconds * 60 ); //Math.ceil ( seconds / fixedTime );
        fixedtimeStep = seconds / maxSubSteps;
    }

    world.stepSimulation( seconds, maxSubSteps, fixedtimeStep );

}

function stepDelta () {

    var time = Date.now();
    var seconds = ( time - last_step ) * 0.001;
    last_step = time;

    //console.log(seconds)

    world.stepSimulation( seconds, 1, seconds );

}*/

self.onmessage = function ( e ) {

    var data = e.data;
    var m = data.m;

    /*if( m === 'init' ) init( data );
    if( m === 'step' ) step( data );
    if( m === 'start' ) start();
    if( m === 'reset' ) reset( data );

    if( m === 'key' ) key = data.o.key;
    if( m === 'setDriveCar' ) currentCar = data.o.n;
    if( m === 'substep' ) substep = data.o.substep;
    if( m === 'set' ) tmpset = data.o;

    if( m === 'moveSoftBody' ) moveSoftBody( data.o );

    if( m === 'add' ) add( data.o );
    if( m === 'vehicle' ) addVehicle( data.o );
    if( m === 'character' ) addCharacter( data.o );
    if( m === 'terrain' ) terrainPostStep( data.o );
    if( m === 'gravity' ) gravity( data.o );
    if( m === 'anchor' ) anchor( data.o );
    if( m === 'apply' ) apply( data.o );*/



    switch( m ){

        case 'init': init( data ); break;
        case 'step': step( data ); break;
        case 'start': start( data ); break;
        case 'reset': reset( data ); break;

        case 'key': tmpKey = data.o.key; break;
        case 'setDriveCar': currentCar = data.o.n; break;
        case 'substep': substep = data.o.substep; break;
        //case 'set': tmpset = data.o; break;

        case 'moveSoftBody': moveSoftBody( data.o ); break;

        case 'heroRotation': setHeroRotation( data.o.id, data.o.angle ); break;

        case 'add': add( data.o ); break;
        case 'vehicle': addVehicle( data.o ); break;
        case 'character': addCharacter( data.o ); break;
        case 'terrain': terrainPostStep( data.o ); break;
        case 'gravity': setGravity( data.o ); break;
        case 'anchor': anchor( data.o ); break;
        //case 'apply': apply( data.o ); break;

        case 'forces': tmpForce = data.o.r; break;
        case 'matrix': tmpMatrix = data.o.r; break;

    }

};


function preStep(){



};

function step( o ){

    if( pause ) return;

    // ------- pre step

    key = o.key;

    //set();

    // update matrix

    updateMatrix();

    // update forces

    updateForce();

    // terrain update

    terrainUpdate();

    // ------- buffer data

    if( isBuffer ){

        if( isDynamic ) dynamicARRAY();
        else {
            Br = o.Br;
            Cr = o.Cr;
            Hr = o.Hr;
            Jr = o.Jr;
            Sr = o.Sr;
        }
    }

    // ------- step

    world.stepSimulation( timeStep, substep );
    //world.stepSimulation( o.delay, substep, timeStep );
    //world.stepSimulation( dt, it, dt );

    drive( currentCar );
    move( 0 );

    stepCharacter();
    stepVehicle();
    stepConstraint();
    stepRigidBody();
    stepSoftBody();


    // ------- post step

    if( isBuffer ) self.postMessage({ m:'step', Br:Br, Cr:Cr, Hr:Hr, Jr:Jr, Sr:Sr },[ Br.buffer, Cr.buffer, Hr.buffer, Jr.buffer, Sr.buffer ]);
    else self.postMessage( { m:'step', Br:Br, Cr:Cr, Hr:Hr, Jr:Jr, Sr:Sr } );

};


//--------------------------------------------------
//
//  WORLD
//
//--------------------------------------------------

function init ( o ) {

    isBuffer = o.isBuffer || false;
    isDynamic = o.isDynamic || false;

    if(o.timeStep !== undefined ) timeStep = o.timeStep;
    timerStep = timeStep * 1000;
    substep = o.substep || 2;

    importScripts( o.blob );

    importScripts( 'ammo/math.js' );
    importScripts( 'ammo/world.js' );
    importScripts( 'ammo/character.js' );
    importScripts( 'ammo/constraint.js' );
    importScripts( 'ammo/rigidBody.js' );
    importScripts( 'ammo/softBody.js' );
    importScripts( 'ammo/terrain.js' );
    importScripts( 'ammo/vehicle.js' );

    // active transform

    trans = new Ammo.btTransform();
    quat = new Ammo.btQuaternion();
    pos = new Ammo.btVector3();

    // hero Transform

    posW = new Ammo.btVector3();
    quatW = new Ammo.btQuaternion();
    transW = new Ammo.btTransform();

    // tmp Transform

    tmpTrans = new Ammo.btTransform()
    tmpPos = new Ammo.btVector3();
    tmpQuat = new Ammo.btQuaternion();

    // extra vector

    tmpPos1 = new Ammo.btVector3();
    tmpPos2 = new Ammo.btVector3();
    tmpPos3 = new Ammo.btVector3();
    tmpPos4 = new Ammo.btVector3();

    // extra transform

    tmpTrans1 = new Ammo.btTransform();
    tmpTrans2 = new Ammo.btTransform();

    // gravity
    gravity = new Ammo.btVector3();

    addWorld();

    bodys = [];
    softs = [];
    joints = [];
    cars = [];
    carsInfo = [];
    heros = [];
    solids = [];

    // use for get object by name
    byName = {};

    //

    self.postMessage({ m:'init' });
    
};

function reset ( o ) {

    //if( !isBuffer ) 
    //clearInterval( timer );

    pause = true;

    tmpForce = [];

    clearJoint();
    clearRigidBody();
    clearVehicle();
    clearCharacter();
    clearSoftBody();

    // clear body name object
    byName = {};

    

    if( o.full ){

        clearWorld();
        addWorld();

    }

    setGravity();

    pause = false;

    if( isBuffer ){

        if( isDynamic ) dynamicARRAY();
        else initARRAY();
        self.postMessage({ m:'start', Br:Br, Cr:Cr, Hr:Hr, Jr:Jr, Sr:Sr },[ Br.buffer, Cr.buffer, Hr.buffer, Jr.buffer, Sr.buffer ]);

    } else {

        initARRAY();
        self.postMessage({ m:'start' });

    }

};



function wipe (obj) {
    for (var p in obj) {
        if ( obj.hasOwnProperty( p ) ) delete obj[p];
    }
};




//--------------------------------------------------
//
//  ADD
//
//--------------------------------------------------

function add ( o, extra ) {

    o.type = o.type === undefined ? 'box' : o.type;

    var type = o.type;
    var prev = o.type.substring( 0, 4 );

    if( prev === 'join' ) addJoint( o );
    else if( prev === 'soft' || type === 'ellipsoid'  || type === 'rope'  || type === 'cloth' ) addSoftBody( o );
    else if( type === 'terrain' ) addTerrain( o );
    else addRigidBody( o, extra );

};






function anchor( o ){

    getByName(o.soft).appendAnchor( o.pos, getByName(o.body), false, o.influence || 0.5 );

};

//--------------------------------------------------
//
//  RAY
//
//--------------------------------------------------

function addRay ( o ) {

    if( o.p1 !== undefined ) tmpPos1.fromArray( o.p1 );
    if( o.p2 !== undefined ) tmpPos2.fromArray( o.p2 );

    var rayCallback = new Ammo.ClosestRayResultCallback( tmpPos1, tmpPos2 );
    world.rayTest( tmpPos1, tmpPos2, rayCallback );

    //if(rayCallback.hasHit()){
       // printf("Collision at: <%.2f, %.2f, %.2f>\n", rayCallback.m_hitPointWorld.getX(), rayCallback.m_hitPointWorld.getY(), rayCallback.m_hitPointWorld.getZ());
   // }

};

//--------------------------------------------------
//
//  GET OBJECT
//
//--------------------------------------------------

function getByName( n ){

    return byName[ n ] || null;

}


//--------------------------------------------------
//
//  FORCE APPLY
//
//--------------------------------------------------

function updateForce () {

    while( tmpForce.length > 0 ) applyForce( tmpForce.pop() );

}

function applyForce ( r ) {

    var b = getByName( r[0] );

    //console.log( r[0], b )

    if( b === null ) return;



    if( r[2] !== undefined ) tmpPos1.fromArray( r[2] );
    if( r[3] !== undefined ) tmpPos2.fromArray( r[3] );

    switch(r[1]){
        case 'force' : b.applyForce( tmpPos1, tmpPos2 ); break;// force , rel_pos 
        case 'torque' : b.applyTorque( tmpPos1 ); break;
        case 'localTorque' : b.applyLocalTorque( tmpPos1 ); break;
        case 'centralForce' : b.applyCentralForce( tmpPos1 ); break;
        case 'centralLocalForce' : b.applyCentralLocalForce( tmpPos1 ); break;
        case 'impulse' : b.applyImpulse( tmpPos1, tmpPos2 ); break;// impulse , rel_pos 
        case 'centralImpulse' : b.applyCentralImpulse( tmpPos1 ); break;

        // joint

        case 'motor' : b.enableAngularMotor( true, r[2][0], r[2][1] ); break; // bool, targetVelocity, maxMotorImpulse

    }
    

}


//--------------------------------------------------
//
//  KINEMATICS MATRIX SET
//
//--------------------------------------------------

function updateMatrix () {

    while( tmpMatrix.length > 0 ) applyMatrix( tmpMatrix.pop() );

}

function applyMatrix ( r ) {

    var b = getByName( r[0] );

    if( b === null ) return;

    tmpTrans.setIdentity();

    if( r[1] !== undefined ) { tmpPos.fromArray( r[1] ); tmpTrans.setOrigin( tmpPos ); }
    if( r[2] !== undefined ) { tmpQuat.fromArray( r[2] ); tmpTrans.setRotation( tmpQuat ); }

    b.getMotionState().setWorldTransform( tmpTrans );

}