import { Object3D, Plane, Vector4 } from 'three';
import { Vector3 } from 'three';

import FontLibrary from '../../font/FontLibrary.js';
import UpdateManager from './UpdateManager.js';

import DEFAULTS from '../../utils/Defaults.js';
import FontFamily from '../../font/FontFamily';
import * as FontWeight from '../../utils/font/FontWeight';
import * as FontStyle from '../../utils/font/FontStyle';
import Behavior from '../../behaviors/Behavior';
import Lines from './Lines';


//JSDoc related imports
/* eslint-disable no-unused-vars */
import { Mesh, Material } from 'three';
import FontVariant from '../../font/FontVariant';
import Mediator from '../../utils/mediator/Mediator';
/* eslint-enable no-unused-vars */

/**

Job:
- Set this component attributes and call updates accordingly
- Getting this component attribute, from itself or from its parents
- Managing this component's states

This is the core module of three-mesh-ui. Every component is composed with it.
It owns the principal public methods of a component : set, setupState and setState.

 */

export default class MeshUIComponent extends Object3D {

	/**
	 *
	 * @param {Object.<(string), any>} options
	 */
		constructor( options ) {

			super( options );

			this.states = {};
			this.currentState = undefined;
			this.isUI = true;
			this.autoLayout = true;

			// children

			/**
			 *
			 * @type {MeshUIComponent[]}
			 */
			this.childrenUIs = [];

			/**
			 *
			 * @type {MeshUIComponent[]}
			 */
			this.childrenBoxes = [];

			/**
			 *
			 * @type {MeshUIComponent[]}
			 */
			this.childrenTexts = [];

			/**
			 *
			 * @type {MeshUIComponent[]}
			 */
			this.childrenInlines = [];


			/**
			 * parents
			 * @type {MeshUIComponent|null}
			 */
			this.parentUI = null;

			// update parentUI when this component will be added or removed
			this.addEventListener( 'added', this._rebuildParentUI );
			this.addEventListener( 'removed', this._rebuildParentUI );

			/**
			 *
			 * @type {Mesh|null}
			 * @protected
			 */
			this._main = null;

			// hooks
			this._hooks = {};
			this._onAfterUpdates = [];

			this.position.z = this.getOffset();

			/**
			 *
			 * @type {Object.<{m:string, t?:(value:any) => any}>}
			 * @protected
			 */
			this._materialMediation = {};

			this._meshMediation = {
				_castShadow:{m:'castShadow'},
				_receiveShadow:{m:'receiveShadow'},
				// _renderOrder:{m:'renderOrder'}
			}

			/**
			 *
			 * @type {Vector4}
			 * @private
			 */
			this._borderRadius = new Vector4().copy( DEFAULTS.borderRadius );

			/**
			 *
			 * @type {Vector4}
			 * @private
			 */
			this._borderWidth = new Vector4().copy( DEFAULTS.borderWidth );

			/**
			 * @Todo: Probably only for boxComponents
			 * @type {Lines}
			 */
			this.lines = new Lines();

			/**
			 *
			 * @type {FontVariant}
			 * @protected
			 */
			this._font = null;

		}

		/////////////
		/// GETTERS
		/////////////

		getClippingPlanes() {

			const planes = [];

			if ( this.parentUI ) {

				if ( this.isBlock && this.parentUI.getHiddenOverflow() ) {

					const yLimit = ( this.parentUI.getHeight() / 2 ) - ( this.parentUI.padding || 0 );
					const xLimit = ( this.parentUI.getWidth() / 2 ) - ( this.parentUI.padding || 0 );

					const newPlanes = [
						new Plane( new Vector3( 0, 1, 0 ), yLimit ),
						new Plane( new Vector3( 0, -1, 0 ), yLimit ),
						new Plane( new Vector3( 1, 0, 0 ), xLimit ),
						new Plane( new Vector3( -1, 0, 0 ), xLimit )
					];

					newPlanes.forEach( plane => {

						plane.applyMatrix4( this.parent.matrixWorld );

					} );

					planes.push( ...newPlanes );

				}

				if ( this.parentUI.parentUI ) {

					planes.push( ...this.parentUI.getClippingPlanes() );

				}

			}

			return planes;

		}

		/**
		 * @TODO : This is already present in MaterialManager
		 * Update a component's materials clipping planes.
		 * Called every frame.
		 */
		updateClippingPlanes( value ) {

			const newClippingPlanes = value !== undefined ? value : this.getClippingPlanes();

			if ( JSON.stringify( newClippingPlanes ) !== JSON.stringify( this.clippingPlanes ) ) {

				this.clippingPlanes = newClippingPlanes;

				if ( this.material ) this.material.clippingPlanes = this.clippingPlanes;

			}

		}

		/** Get the highest parent of this component (the parent that has no parent on top of it) */
		getHighestParent() {

			if ( !this.parentUI ) {

				return this;

			}

			return this.parent.getHighestParent();


		}

		/**
		 * look for a property in this object, and if does not find it, find in parents or return default value
		 * @private
		 */
		_getProperty( propName ) {

			if ( this[ propName ] === undefined && this.parentUI ) {

				return this.parent._getProperty( propName );

			} else if ( this[ propName ] !== undefined ) {

				return this[ propName ];

			}

			return DEFAULTS[ propName ];

		}

		//

		getFontSize() {

			return this._getProperty( 'fontSize' );

		}

		getSegments() {

			return this.segments || 1;

		}

		getAlphaTest() {

			return this.alphaTest || 0.02;

		}

		getFontKerning() {

			return this._getProperty( 'fontKerning' );

		}

		getFontStyle() {

			return this._getProperty( 'fontStyle' );

		}

		getFontWeight() {

			return this._getProperty( 'fontWeight' );

		}

		getLetterSpacing() {

			return this._getProperty( 'letterSpacing' );

		}

		getFontTexture() {

			if( this._font && this._font.isReady ){

				return this._font.texture;

			}

			return this._getProperty( 'fontTexture' );

		}

		getFontFamily() {

			return this._getProperty( 'fontFamily' );

		}

		getBreakOn() {

			return this._getProperty( 'breakOn' );

		}

		getWhiteSpace() {

			return this._getProperty( 'whiteSpace' );

		}

		getTextAlign() {

			return this._getProperty( 'textAlign' );

		}

		getFontColor() {

			return this._getProperty( 'fontColor' );

		}


		getFontSupersampling() {

			return this._getProperty( 'fontSupersampling' );

		}

		getFontOpacity() {

			return this._getProperty( 'fontOpacity' );

		}

		getFontPXRange() {

			return this._getProperty( 'fontPXRange' );

		}

		getBorderRadius() {

			return this._getProperty( 'borderRadius' );

		}

		getBorderWidth() {

			return this._getProperty( 'borderWidth' );

		}

		getBorderColor() {

			return this._getProperty( 'borderColor' );

		}

		getBorderOpacity() {

			return this._getProperty( 'borderOpacity' );

		}

		/// SPECIALS

		/** return the first parent with a 'threeOBJ' property */
		getContainer() {

			if ( !this.threeOBJ && this.parent ) {

				return this.parent.getContainer();

			} else if ( this.threeOBJ ) {

				return this;

			}

			return DEFAULTS.container;


		}

		/** Get the number of UI parents above this elements (0 if no parent) */
		getParentsNumber( i ) {

			i = i || 0;

			if ( this.parentUI ) {

				return this.parentUI.getParentsNumber( i + 1 );

			}

			return i;

		}

		////////////////////////////////////
		/// GETTERS WITH NO PARENTS LOOKUP
		////////////////////////////////////

		getBackgroundOpacity() {

			return ( !this.backgroundOpacity && this.backgroundOpacity !== 0 ) ?
				DEFAULTS.backgroundOpacity : this.backgroundOpacity;

		}

		getBackgroundColor() {

			return this.backgroundColor || DEFAULTS.backgroundColor;

		}

		getBackgroundTexture() {

			// return this.backgroundTexture || DEFAULTS.backgroundTexture();
			return this.backgroundTexture || DEFAULTS.backgroundTexture;

		}

		/**
		 * @deprecated
		 * @returns {string}
		 */
		getAlignContent() {

			return this.alignContent || DEFAULTS.alignContent;

		}

		getAlignItems() {

			return this.alignItems || DEFAULTS.alignItems;

		}

		getContentDirection() {

			return this.contentDirection || DEFAULTS.contentDirection;

		}

		getJustifyContent() {

			return this.justifyContent || DEFAULTS.justifyContent;

		}

		getInterLine() {

			return ( this.interLine === undefined ) ? DEFAULTS.interLine : this.interLine;

		}

		getOffset() {

			return ( this.offset === undefined ) ? DEFAULTS.offset : this.offset;

		}

		getBackgroundSize() {

			return ( this.backgroundSize === undefined ) ? DEFAULTS.backgroundSize : this.backgroundSize;

		}

		getHiddenOverflow() {

			return ( this.hiddenOverflow === undefined ) ? DEFAULTS.hiddenOverflow : this.hiddenOverflow;

		}

		getBestFit() {

			return ( this.bestFit === undefined ) ? DEFAULTS.bestFit : this.bestFit;

		}

		///////////////
		///  UPDATE
		///////////////

		/**
		 * Filters children in order to compute only one times children lists
		 * @private
		 */
		_rebuildChildrenLists() {

			// Stores all children that are ui
			this.childrenUIs = this.children.filter( child => child.isUI && child.visible );

			// Stores all children that are box
			this.childrenBoxes = this.childrenUIs.filter( child => child.isBoxComponent );

			// Stores all children that are inline
			this.childrenInlines = this.childrenUIs.filter( child => child.isInline );

			// Stores all children that are text
			this.childrenTexts = this.childrenUIs.filter( child => child.isText );
		}

		/**
		 * Try to retrieve parentUI after each structural change
		 * @private
		 */
		_rebuildParentUI = () => {

			if ( this.parent && this.parent.isUI ) {

				this.parentUI = this.parent;
				this.position.z = this.getOffset();

			} else {

				this.parentUI = null;

			}

		};

		/**
		 * When the user calls component.add, it registers for updates,
		 * then call THREE.Object3D.add.
		 */

	/* eslint-disable no-unused-vars */
	/**
	 *
	 * @override
	 * @param {...Object3D} object
	 * @return {this}
	 */
	add( object) {

			for ( const id of Object.keys( arguments ) ) {

				// An inline component relies on its parent for positioning
				if ( arguments[ id ].isUI ) this.update( null, true );
				// if ( arguments[ id ].isInline ) this.update( null, true );

			}

			super.add( ...arguments );

			this._rebuildChildrenLists();

			return this;

		}


	/**
	 * When the user calls component.remove, it registers for updates,
	 * then call THREE.Object3D.remove.
	 * @override
	 * @param {...Object3D} object
	 * @return {this}
	 */
		remove(object) {

			for ( const id of Object.keys( arguments ) ) {

				// An inline component relies on its parent for positioning
				if ( arguments[ id ].isInline ) this.update( null, true );

			}

			super.remove( ...arguments );

			this._rebuildChildrenLists();

			return this;

		}

	/* eslint-enable no-unused-vars */

		//

		update( updateParsing, updateLayout, updateInner ) {

			UpdateManager.requestUpdate( this, updateParsing, updateLayout, updateInner );

		}

		performAfterUpdate() {

			for ( let i = 0; i < this._onAfterUpdates.length; i++ ) {

				this._onAfterUpdates[ i ]();

			}

		}

		/**
		 *
		 * @param func
		 */
		set onAfterUpdate( func ) {

			console.warn( '`onAfterUpdate` property has been deprecated, please rely on `addAfterUpdate` instead.' );
			this.addAfterUpdate( func );

		}

		addAfterUpdate( func ) {

			this._onAfterUpdates.push( func );

		}

		/**
		 *
		 * @TODO: Adding a new hook should no be direct, but delayed before or after performing the hookLoop
		 * @param {string} type
		 * @param {function|Behavior} newHook
		 * @param {number} priority
		 */
		hook( type, newHook, priority = 10) {

			if ( !this._hooks[ type ] ) {

				console.error(`MeshUIComponent::hook() - The provided type('${type}') is not valid on ${typeof this} component`);
				return;

			}

			if ( !(newHook instanceof Behavior) ){

				newHook = { priority, act: newHook };

			}

			if( this._hooks[type].find( h => h.act === newHook.act ) ) {

				console.error(`MeshUIComponent::hook() - The provided func('${newHook.act}') is already registered in hooks. Aborted`);
				return;

			}

			type._hooks[type].push( newHook );
			type._hooks[type].sort( ( a, b ) => {
				if( a.priority < b.priority ) return - 1;
				if( a.priority > b.priority ) return 1;
				return 0;
			});

		}

		/**
		 *
		 * @param {string} type
		 * @param {function|Behavior} hookToRemove
		 */
		unhook( type, hookToRemove ) {

			if ( !this._hooks[ type ] ) {

				console.error(`MeshUIComponent::unhook() - The provided type('${type}') is not valid on ${typeof this} component`);
				return;

			}

			if ( !(hookToRemove instanceof Behavior) ) {

				hookToRemove = { act: hookToRemove };

			}

			const indexToRemove = this._hooks[type].findIndex( h => h.act === hookToRemove.act )
			if( indexToRemove !== -1 ) {

				this._hooks[type].splice( indexToRemove, 1 );

			}

		}

		performHooks( hooks , alterable = null ) {

			for ( let i = 0; i < hooks.length; i++ ) {

				hooks[ i ]( alterable );

			}

		}

		/**
		 * Set this component's passed parameters.
		 * If necessary, take special actions.
		 * Update this component unless otherwise specified.
		 */
		set( options ) {

			let parsingNeedsUpdate, layoutNeedsUpdate, innerNeedsUpdate;

			// Register to the update manager, so that it knows when to update

			UpdateManager.register( this );

			// Abort if no option passed

			if ( !options || JSON.stringify( options ) === JSON.stringify( {} ) ) return;

			// Set this component parameters according to options, and trigger updates accordingly
			// The benefit of having two types of updates, is to put everthing that takes time
			// in one batch, and the rest in the other. This way, efficient animation is possible with
			// attribute from the light batch.

			for ( const prop of Object.keys( options ) ) {

				if ( this[ prop ] != options[ prop ] ) {

					const value = options[ prop ];

					switch ( prop ) {

						case 'content' :
						case 'fontWeight' :
						case 'fontStyle' :
						case 'whiteSpace': // @TODO : Whitespace could also just be layouting
							if ( this.isText ) parsingNeedsUpdate = true;
							layoutNeedsUpdate = true;
							this[ prop ] = value;
							break;

						// Only layout now - Not anymore parsing
						case 'fontSize' :
						case 'fontKerning' :
						case 'breakOn':
						case 'segments':
							layoutNeedsUpdate = true;
							this[ prop ] = value;
							break;

						case 'bestFit' :
							if ( this.isBlock ) {
								parsingNeedsUpdate = true;
								layoutNeedsUpdate = true;
							}
							this[ prop ] = value;
							break;

						case 'width' :
						case 'height' :
						case 'padding' :
							// @TODO: I don't think this is true anymore
							if ( this.isInlineBlock || ( this.isBlock ) ) parsingNeedsUpdate = true;
							layoutNeedsUpdate = true;
							this[ prop ] = value;
							break;

						case 'letterSpacing' :
						case 'interLine' :
							// @TODO: I don't think this is true anymore
							if ( this.isBlock ) parsingNeedsUpdate = true;
							layoutNeedsUpdate = true;
							this[ prop ] = value;
							break;

						case 'margin' :
						case 'contentDirection' :
						case 'justifyContent' :
						case 'alignContent' :
						case 'alignItems' :
						case 'textAlign' :
						case 'textType' :
							layoutNeedsUpdate = true;
							this[ prop ] = value;
							break;

						case 'fontColor' :
						case 'fontOpacity' :
						case 'fontSupersampling' :
						case 'backgroundColor' :
						case 'backgroundOpacity' :
						case 'backgroundTexture' :
						case 'backgroundSize' :
						case 'borderColor' :
						case 'borderOpacity' :
							innerNeedsUpdate = true;
							this[ prop ] = value;
							break;

						case 'hiddenOverflow' :
							this[ prop ] = value;
							break;

						case 'offset':
							if( !this.isBlock || this.parentUI ){

								this[ prop ] = value;
								this.position.z = value;

							}
							break;

						// abstracted properties, those properties don't need to be store as this[prop] = value
						case 'borderRadius' :
							this._fourDimensionsValueSetter( this._borderRadius, value);
							break;
						case 'borderRadiusTopLeft':
							this._borderRadius.x = value;
							break;
						case 'borderRadiusTopRight':
							this._borderRadius.y = value;
							break;
						case 'borderRadiusBottomRight':
							this._borderRadius.z = value;
							break;
						case 'borderRadiusBottomLeft':
							this._borderRadius.w = value;
							break;
						case 'borderRadiusTop':
							this._borderRadius.x = value;
							this._borderRadius.y = value;
							break;
						case 'borderRadiusRight':
							this._borderRadius.y = value;
							this._borderRadius.z = value;
							break;
						case 'borderRadiusLeft':
							this._borderRadius.x = value;
							this._borderRadius.w = value;
							break
						case 'borderRadiusBottom':
							this._borderRadius.z = value;
							this._borderRadius.w = value;
							break;


						case 'borderWidth' :
							this._fourDimensionsValueSetter( this._borderWidth, value);
							break;
						case 'borderWidthTop':
							this._borderWidth.x = value;
							break;
						case 'borderWidthRight':
							this._borderWidth.y = value;
							break;
						case 'borderWidthBottom':
							this._borderWidth.z = value;
							break;
						case 'borderWidthLeft':
							this._borderWidth.w = value;
							break;

						default:
							this[ prop ] = value;
					}

				}

			}

			// special cases, this.update() must be called only when some files finished loading

			// Selection of fontFamily and font property
			// 1. Preferred way, give a {FontFamily} property
			if ( options.fontFamily instanceof FontFamily ) {

				this.fontFamily = options.fontFamily;
				this.font = options.fontFamily.getVariant( this.getFontWeight(), this.getFontStyle() );

			}

			// 1.1 Preferred way, a bit annoying to check options.fontTexture ( retro-compatibility )
			else if( typeof options.fontFamily === 'string' && !options.fontTexture ) {

				const fontFamily = FontLibrary.getFontFamily( options.fontFamily );

				if( fontFamily ){

					this.fontFamily = fontFamily;
					this.font = fontFamily.getVariant( this.getFontWeight(), this.getFontStyle() );

				}

			}
			// 2. < v7.x.x way
			else if ( options.fontFamily && options.fontTexture ) {

				// Set from old way, check if that family is already registered
				const fontName = options.fontFamily.pages ? options.fontFamily.info.face : options.fontFamily;

				let fontFamily = FontLibrary.getFontFamily( fontName );

				if ( !fontFamily ) {

					fontFamily = FontLibrary.addFontFamily( fontName )
						.addVariant( FontWeight.NORMAL, FontStyle.NORMAL, options.fontFamily, options.fontTexture );

				}

				this.fontFamily = fontFamily;

				// @TODO: Add more variant selection
				this.font = fontFamily.getVariant( FontWeight.NORMAL, FontStyle.NORMAL );

			}

			// if font kerning changes for a child of a block with Best Fit enabled, we need to trigger parsing for the parent as well.
			if ( this.parentUI && this.parentUI.getBestFit() != 'none' ) this.parentUI.update( true, true, false );

			// Call component update

			this.update( parsingNeedsUpdate, layoutNeedsUpdate, innerNeedsUpdate );


			if ( layoutNeedsUpdate ) this.getHighestParent().update( false, true, false );


			//
			this._transferToMaterial( options );

			//
			// this._transferToMesh( options );



		}

		/////////////////////
		// STATES MANAGEMENT
		/////////////////////

		/** Store a new state in this component, with linked attributes */
		setupState( options ) {

			this.states[ options.state ] = {
				attributes: options.attributes,
				onSet: options.onSet
			};

		}

		/** Set the attributes of a stored state of this component */
		setState( state ) {

			const savedState = this.states[ state ];

			if ( !savedState ) {
				console.warn( `state "${state}" does not exist within this component` );
				return;
			}

			if ( state === this.currentState ) return;

			this.currentState = state;

			if ( savedState.onSet ) savedState.onSet();

			if ( savedState.attributes ) this.set( savedState.attributes );

		}

		/**
		 * Get completely rid of this component and its children, also unregister it for updates
		 * @override
		 * @return {this}
		 */
		clear() {

			this.traverse( ( obj ) => {

				UpdateManager.disposeOf( obj );

				if ( obj.material ) obj.material.dispose();

				if ( obj.geometry ) obj.geometry.dispose();

			} );

			return this;
		}

		/***********************************************************************************************************************
		 * TO MATERIAL HOLDER
		 **********************************************************************************************************************/

		get material() {
			return this._material;
		}

		/**
		 *
		 * @param {Material|ShaderMaterial} material
		 */
		set material( material ) {

			this._material = material;

			// Update the fontMaterialProperties that need to be transferred to
			this._materialMediation = {...material.constructor.mediation }

			// transfer all the properties to material
			this._transferToMaterial();

			if( this._main ) {

				this._main.material = this._material;

			}

		}

		/**
		 *
		 * @param {Material|null} material
		 */
		set customDepthMaterial( material ) {

			this._customDepthMaterial = material;

			this._transferToMaterial();

			if ( this._main ) {
				// transfer to the main if isset
				this._main.customDepthMaterial = this._customDepthMaterial;

			}

		}

		get customDepthMaterial() { return this._customDepthMaterial; }

		/**
		 * According to the list of materialProperties
		 * some properties are sent to material
		 * @private
		 */
		_transferToMaterial( options = null ) {

			Mediator.mediate(this, this._material, options, this._materialMediation, this.customDepthMaterial);

		}

		_transferToMesh( options = null ) {

			Mediator.mediate( this, this._main, options, this._meshMediation );

		}

		/**
		 *
		 * @param {Vector4} vector4
		 * @param {string|number|Array.<string|number>} value
		 * @private
		 */
		_fourDimensionsValueSetter( vector4, value ) {

			if( value instanceof Vector4 ) {

				vector4.copy( value );
				return ;

			}

			if (typeof value === 'string' || value instanceof String) {

				value = value.split(" ");

			}

			if( Array.isArray( value ) ) {

				value = value.map( v => parseFloat(v) );

				switch ( value.length ) {

					case 1:
						vector4.setScalar( value[0] );
						return;

					case 2:
						vector4.x = vector4.z = value[0];
						vector4.y = vector4.w = value[1];
						return;

					case 3:
						vector4.x = value[0];
						vector4.y = value[1];
						vector4.z = value[2];
						return;

					case 4:
						vector4.x = value[0];
						vector4.y = value[1];
						vector4.z = value[2];
						vector4.w = value[3];
						return;

					default:
						console.error("Four Dimension property has more than four values");
						return;

				}

			}

			if( !isNaN(value) ) {

				vector4.setScalar( value );

			}

		}

	/**
	 * @param {FontVariant} value
	 */
	set font( value ) {

		this._font = value;

	}

	/**
	 *
	 * @returns {FontVariant}
	 */
	get font() {

		return this._font;

	}

	/*********************************************************************************************************************
	 * MESH MEDIATION
	 ********************************************************************************************************************/

	/**
	 *
	 * @param {boolean} value
	 */
	set visible( value ) {

		this._visible = value;

		// @TODO: Instead of direct execution of _rebuildChildrenList
		//				It could be better to "dirtying" the children list and compute it only once on next frame
		this.parentUI?._rebuildChildrenLists();

	}

	/**
	 *
	 * @return {boolean}
	 */
	get visible() { return this._visible; }

	/**
	 *
	 * @param {boolean} value
	 */
	set castShadow( value ) {

		this._castShadow = value;

		if ( this._main ) {

			this._main.castShadow = this._castShadow;

		}

	}

	/**
	 *
	 * @return {boolean}
	 */
	get castShadow() { return this._castShadow; }

	/**
	 *
	 * @param {boolean} value
	 */
	set receiveShadow( value ) {

		this._receiveShadow = value;

		if ( this._main ) {

			this._main.receiveShadow = this._receiveShadow;

		}

	}

	/**
	 *
	 * @return {boolean}
	 */
	get receiveShadow() { return this._receiveShadow; }

	/**
	 *
	 * @param {number} value
	 */
	set renderOrder( value ) {

		this._renderOrder = value;

		if( this._main ) {

			this._main.renderOrder = this._renderOrder;

		}

	}

	/**
	 *
	 * @return {number}
	 */
	get renderOrder( ) { return this._renderOrder; }

	/*********************************************************************************************************************
	 * MATERIAL MEDIATION
	 ********************************************************************************************************************/

	/**
	 *
	 * @param {number} value
	 */
	set side( value ) {

		this._side = value;

		if ( this._material ) this._material.side = value;

	}

	/**
	 *
	 * @return {number}
	 */
	get side() { return this._side; }

}
