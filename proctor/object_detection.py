import cv2
import sys
import os
import matplotlib
import numpy as np
from collections import Counter

############################################ Setup YOLO v3 ######################################################
lbl_file        = 'models/yolov3.txt'
classes         = open(lbl_file).read().strip().split("\n")

yoloconfig      = 'models/yolov3.cfg'
yoloweights     = 'models/yolov3.weights'
net             = cv2.dnn.readNet(yoloweights,yoloconfig)

############################################# YOLO Detection #####################################################

def yoloV3Detect(img,scFactor=1/255,nrMean=(0,0,0),RBSwap=True,scoreThres=0.7,nmsThres=0.4):

  ########################## Create blob #########################
  blob = cv2.dnn.blobFromImage(image=img, 
                              scalefactor=scFactor, 
                              size=(416, 416), 
                              mean=nrMean, 
                              swapRB=RBSwap, 
                              crop=False)
  
  ########################## Prediction ############################
  # FIX: Made this function robust to different OpenCV versions
  def getOutputLayers(net):
    layer_names = net.getLayerNames()
    # The output of getUnconnectedOutLayers can be 2D [[200], [254]] or 1D [200, 254]
    # We flatten it to handle both cases
    output_layer_indices = net.getUnconnectedOutLayers().flatten()
    return [layer_names[i - 1] for i in output_layer_indices]

  net.setInput(blob) 
  outLyrs = getOutputLayers(net) 
  preds = net.forward(outLyrs)

  ############### Extract information from the output ###############
  imgHeight = img.shape[0]
  imgWidth = img.shape[1]

  classId = [] 
  confidences = [] 
  boxes = []

  for scale in preds: 
    for pred in scale: 
      scores = pred[5:] 
      clss = np.argmax(scores) 
      confidence = scores[clss]

      if confidence > scoreThres: 
        xc = int(pred[0]*imgWidth) 
        yc = int(pred[1]*imgHeight) 
        w = int(pred[2]*imgWidth) 
        h = int(pred[3]*imgHeight) 
        x = xc - w/2
        y = yc - h/2
        
        classId.append(clss) 
        confidences.append(float(confidence)) 
        boxes.append([x, y, w, h])
  
  ############### Non-maximal suppresion (NMS) #####################
  # FIX: Made NMS processing robust to "no detections" case
  selected_indices = cv2.dnn.NMSBoxes(bboxes=boxes, 
                                      scores=confidences, 
                                      score_threshold=scoreThres, 
                                      nms_threshold=nmsThres)
  
  fboxes = []
  fclasses = []
  
  # Check if any boxes were selected
  if len(selected_indices) > 0:
    # Flatten the indices to handle both 1D and 2D returns
    for i in selected_indices.flatten():
        fboxes.append(boxes[i])
        fclasses.append(str(classes[classId[i]]))

  return [fboxes,fclasses]