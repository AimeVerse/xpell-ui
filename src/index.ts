/**
 * Xpell - Real-Time User Interface Platform
 * Typescript Edition
 * Library Entry Point
 * 
 * @description Universal User Interface (UI) Engine for Javascript supporting devices & browsers
 * @author Fridman Fridman <fridman.tamir@gmail.com>
 * @since  22/07/2022
 * @Copyright Aime Technologies 2022, all right reserved
 *
 *      This program is free software; you can redistribute it and/or
 *		modify it under the terms of the GNU General Public License
 *		as published by the Free Software Foundation; either version
 *		3 of the License, or (at your option) any later version.
 *
 */

const XFolder = "./src/"

/**
 * Xpell Core exports
 */

export {
    Xpell,Xpell as _x,
    XUtils,XUtils as _xu,
    XData, XData as _xd,type XDataObject,type XDataVariable,_XData,
    XParser,XCommand,XModule,type XCommandData, type XModuleData,
    // GenericModule as XGenericModule,
    XLogger,XLogger as _xlog,_XLogger,
    XObjectManager,XObject,XObjectPack,type IXObjectData,type XDataXporterHandler,
    type XObjectData,type XObjectOnEventIndex,type XObjectOnEventHandler,
    type XEventListener,type XEvent,
    type XNanoCommandPack,type XNanoCommand,
    XEventManager,XEventManager as _xem,_XEventManager,
    type HTMLEventListenersIndex,type XEventListenerOptions
} from "./Core/Xpell"

export {Wormholes,Wormholes as _wh,WormholeEvents,type MessageType} from "./Wormholes/Wormholes"


export {XUI,type XUIApp,XUIModule} from "./XUI/XUI"

export {XUIObject} from "./XUI/XUIObject"

export {XUIObjects,XView,XButton,XForm,XHeader,XImage,XLabel,XLink,XList,XNavBar,
    XTextArea,XTextField,XVideo,XWebcam,
    XHTML,XInput,XSVG,XPassword,XSVGCircle,
    XSVGEllipse,XSVGLine,XSVGPolygon,XSVGRect,XSVGPolyline,XSVGPath
} from "./XUI/XUICoreObjects"

// export {XJoystick} from "./src/XUI/XJoystick"
export {XViewManager,type XViewsPack} from "./XUI/XViewManager"


export {XDB,XDB as _xdb,_XDataBase} from "./XDB/XDB"

export {XAI,XAI as _xai,XAIModule} from "./XAI/XAI"
export {XAIObject} from "./XAI/XAIObject"
export {XAIObjects,XTTS} from "./XAI/XAICoreObjects"
export {XUIAnimate,_AnimateCSS} from "./XUI/XUIAnimations"

import {Xpell} from "./Core/Xpell"
export default Xpell

