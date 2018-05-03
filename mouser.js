import React, { Component } from 'react';
import ReactNative, {findNodeHandle, PanResponder, View, StyleSheet} from 'react-native';
import { EventRegister } from 'react-native-event-listeners';

var screenHeight = null
var screenWidth = null
var calculateDimensions = null

export class Screen extends Component{
  constructor(props){
    super()
    this.state={
      mousePosition     : {x:0,y:0},
    }
    calculateDimensions=this.calculateDimensions.bind(this)
  }
  calculateDimensions(box,reportLayout) {
    box.measureLayout(ReactNative.findNodeHandle(this.screen), ( xPos, yPos, Width, Height ) => {
      reportLayout({x:xPos-1,y:yPos-1,width:Width,height:Height})
      })
  }
  componentWillMount(){
    this.listener = EventRegister.addEventListener('mousePosition', (data) => {
      this.setState({mousePosition:data})
    })
  }
  render(){
    return(
      <View {...this.props} 
        ref={(i)=>this.screen=i}
        onLayout={(e)=>{
          const {width,height} = e.nativeEvent.layout
          screenWidth=width
          screenHeight=height
        }}
      >
        <View 
          style={[styles.mouse,{transform:
            [{translateX:this.state.mousePosition.x},{translateY:this.state.mousePosition.y}]}]}
        />      
        {this.props.children}
      </View>
    )
  }
}

export class Mousable extends Component{
  constructor(props){
    super(props)
    this.state={t:0,b:0,l:0,r:0,numPresses:0}
  }
  componentWillMount() {
    this.listener = EventRegister.addEventListener('mousePosition', (data) => {
        const {t,b,l,r} = this.state
        const {x,y} = data
        x>l && x<r && y>t && y<b ? this.props.onHover(true,this.props.name) : this.props.onHover(false,this.props.name)
    })
    this.listener = EventRegister.addEventListener('press', (data) => {
      const {t,b,l,r} = this.state
      const {x,y} = data
      x>l && x<r && y>t && y<b && this.handlePress()
    })
  }
  componentWillUnmount() {
    EventRegister.removeEventListener(this.listener)
  }
  handlePress=()=>{
    var {numPresses} = this.state
    numPresses += 1
    this.setState({numPresses})
    this.startPress(numPresses)
  }
  startPress=(numPresses)=>{
    numPresses == 1 && setTimeout(()=>{
      this.sendPress()
    },200)
  }
  sendPress=()=>{
    const {numPresses} = this.state
    numPresses==1 ? this.props.onPress() : this.props.onDoublePress()
    this.setState({numPresses:0})
  }
  reportLayout=({x,y,width,height})=>{
    console.log('i see' + x + ' '+ y + ' '+ width + ' '+ height + ' ')
    this.setState({t:y,b:y+height,l:x,r:x+width})
  }
  render(){
    return(
      <View {...this.props} 
        ref={(i)=>this.boxView=i}
        onLayout={({nativeEvent})=>{calculateDimensions(this.boxView,this.reportLayout)}}/>
    )
  }
}

export class MousePad extends Component {
  constructor(props) {
    super(props)
    this.state={
      padSize           : {y:0,y:0},
      padPosition       : {t:0,b:0,l:0,r:0},
      lastMousePosition : {x:0,y:0},
      mousePosition     : {x:0,y:0},
      slough            : {x:0,y:0},
      onPad             : true,
      leftPadAt         : {x:0,y:0},
      hovering          : {one:false,two:false,three:false},
      isTap             : false,
    }
  }
  
  panResponder = {}
  
  componentWillMount() {
    this.panResponder = PanResponder.create({
      onStartShouldSetPanResponder: this.handleStartShouldSetPanResponder,
      onPanResponderGrant: this.handlePanResponderGrant,
      onPanResponderMove: this.handlePanResponderMove,
      onPanResponderRelease: this.handlePanResponderEnd,
      onPanResponderTerminate: this.handlePanResponderEnd,
    })
  }
  handleStartShouldSetPanResponder=(e,gestureState)=>{
    return true
  }
  handlePanResponderGrant=(e,gestureState)=>{
    this.setState({isTap:true})
  }
  handlePanResponderMove=(e,gestureState)=>{
    this.setState({isTap:false})
    const {x0,y0,dx,dy} = gestureState
    const {onPad,leftPadAt,padPosition,padSize,slough,lastMousePosition} = this.state
    if(x0+dx>padPosition.l && x0+dx<padPosition.r && y0+dy>padPosition.t && y0+dy < padPosition.b){
      if(onPad==false){
        slough.x += (leftPadAt.x-(x0+dx)  )
        slough.y += (leftPadAt.y-(y0+dy)  )
      }
      const proposedMousePosition = 
        { x:lastMousePosition.x + dx + slough.x,
          y:lastMousePosition.y + dy + slough.y }
      var nextMousePosition = proposedMousePosition    
      if (proposedMousePosition.x < 0){
        slough.x += -proposedMousePosition.x
        nextMousePosition.x=0
        }
      if (proposedMousePosition.x > screenWidth){
        slough.x -= (proposedMousePosition.x - screenWidth)
        nextMousePosition.x = screenWidth
      }
      if (proposedMousePosition.y < 0){
        slough.y += -proposedMousePosition.y
        nextMousePosition.y=0
      }
      if (proposedMousePosition.y > screenHeight){
        slough.y -= (proposedMousePosition.y - screenHeight)
        nextMousePosition.y=screenHeight
      }
    EventRegister.emit('mousePosition', nextMousePosition)
    this.setState({slough, mousePosition:nextMousePosition, onPad:true})
    } else {
      if(onPad==true){
        this.setState({onPad:false,leftPadAt:{x:x0+dx,y:y0+dy}})
      }
    }
  }
  handlePanResponderEnd=(e,gestureState)=>{
    const {isTap,mousePosition} = this.state
    if(isTap){
      this.tap(mousePosition)
    } else {
      const slough={x:0,y:0}
      const lastMousePosition=this.state.mousePosition
      const onPad=true
      this.setState({slough,lastMousePosition,onPad})
    }
  }
  tap=(mousePosition)=>{
    console.log('tap')
    EventRegister.emit('press', mousePosition)
  }
  onLayoutPad=(layout)=>{
    const {x,y,height,width} = layout
    const padSize = {x:width,y:height}
    const padPosition = {t:y,b:y+height,l:x,r:x+width}
    this.setState({padSize,padPosition})
  }
  render(){
    return (
      <View 
        {...this.props} 
        {...this.panResponder.panHandlers}
        onLayout={(e)=>{this.onLayoutPad(e.nativeEvent.layout)}}/>
    )
  }
}

const styles = StyleSheet.create({
  mouse:{
    position:'absolute',
    top:0,
    left:0,
    width:2,
    height:2,
    backgroundColor:'white',
  },
});
