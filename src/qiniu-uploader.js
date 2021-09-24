(function(name, factory){
  if(typeof define === "function" && define.amd){
      define(["jquery"], factory);
  }else if(typeof module !== "undefined" && module.exports){
      module.exports = factory(require("jquery"));
  }else{
      this[name] = factory(jQuery);
  }
})("qiniuUploader", function($){
  if (!String.prototype.tempFormat) {
    String.prototype.tempFormat = function () {
      var args = arguments;
      return this.replace(/{(\d+)}/g, function (match, number) {
        return typeof args[number] != 'undefined' ? args[number] : match;
      });
    };
  }
  var
  upload_img_item_tmpl =
    '<div img-id="{2}" upload-key="{3}" class="uploaditem{0}"><img src="{1}"><span class="leftbtn fa fa-arrow-circle-left"></span><span class="delbtn fa fa-times"></span><span class="progressmask"><span class="progresstxt">1%</span><span class="progress"></span></span></div>',
  upload_file_item_tmpl =
    '<div img-id="{1}" upload-key="{3}" class="uploaditem{0}"><div class="filetype">{2}</div><span class="leftbtn fa fa-arrow-circle-left"></span><span class="delbtn fa fa-times"></span><input type="file" class="editfile"><span class="progressmask"><span class="progresstxt">1%</span><span class="progress"></span></span></div>',
  VIDEO_TYPE = ["mp4"],
  FILECHECK_IMG = ["jpg", "jpeg", "png"],
  FILESIZE_IMG = "2mb",
  qiniuUploader = function(){};

  qiniuUploader.prototype = {
    init: function(option) {
      var
      filecheck = option.filecheck || FILECHECK_IMG,
      mainblock = $(option.filter);
      uploader = option.qiniuObj.uploader({
        runtimes: "html5, flash, html4",
        browse_button: option.inputf,
        uptoken: option.token,
        get_new_uptoken: false,
        domain: "cdnxinli",
        max_file_size: option.maxfilesize || FILESIZE_IMG,
        flash_swf_url: "path/of/plupload/Moxie.swf",
        max_retries: 3,
        unique_names: true,
        dragdrop: true,
        drop_element: option.inputf,
        chunk_size: "4mb",
        auto_start: option.auto_start || false,
        disable_statistics_report: true,
        multi_selection: false,
        init: {
          "FilesAdded": function (up, files) {
            //__pageLoading.show();
            plupload.each(files, function (file) {
              // console.log(file);
              // 文件添加进队列后，处理相关的事情
              //预览文件
              if (!!filecheck && filecheck.indexOf(getFileType(file.name)) < 0) {
                up.removeFile(file);
                __pageAlert.showTimerAlert('上传文件类型不匹配');
                return false
              }
              if (!!option.fileAddCb && !option.fileAddCb(file)) {
                up.removeFile(file);
                return false;
              }
              if (file.type == 'image/jpeg' || file.type == 'image/png') {
                  // 预览
                showuploadimg(file);
              } else {
                showuploadFile(file);
              }
              !!option.fileAddedCb && option.fileAddedCb("add");
            });
          },
          "BeforeUpload": function (up, file) {
            // 每个文件上传前，处理相关的事情
          },
          "UploadProgress": function (up, file) {
            // 每个文件上传时，处理相关的事情
            // console.log(file.percent);
            // console.log(up)
            mainblock.find(".progressmask").last().show().find(".progresstxt").html(file.percent + "%").siblings(".progress").css("height", file.percent + "%");
          },
          "FileUploaded": function (up, file, info) {
            // 查看简单反馈
            var
            retrynums = 0,
            tmp = $.parseJSON(info.response),
            urlval = mainblock.find("input[type='hidden']"),
            uptmp = mainblock.find(".uploaditem[img-id='" + file.id + "']");
            if (uptmp.length == 0) {
              setTimeout(regetDom, 100);
            } else {
              uploaded();
            }
            function regetDom() {
              if (retrynums >= 20) {
                console.log('dom创建失败，请刷新重试');
                return;
              }
              uptmp = mainblock.find(".uploaditem[img-id='" + file.id + "']");
              if (uptmp.length == 0) {
                retrynums++;
                setTimeout(regetDom, 100);
              } else {
                uploaded();
              }
            }
            function uploaded() {
              uptmp.attr("upload-key", tmp.key);
              // console.log(tmp.key);
              urlval.val(makeUploadUrls());
              up.upReady++;
              if (up.upReady >= up.files.length) {
                if (up.UploadComplete) {
                  up.UploadComplete();
                }
              }
            }
          },
          "Error": function (up, err, errTip) {
            //上传出错时，处理相关的事情
            // console.log(err);
            if (err.code == -600) {
              __pageAlert.showTimerAlert("文件体积过大");
            } else if (err.message == "File extension error.") {
              __pageAlert.showTimerAlert("请选择正确的图片");
            } else if (err.status == 614 && err.code == -200) {
              //614文件已存在
              __pageAlert.showTimerAlert("文件已经存在");
            }
          },
          "UploadComplete": function () {
            //队列文件处理完毕后，处理相关的事情
            mainblock.find(".progressmask").hide();
          },
          "Key": function (up, file) {
            return option.updatekey;
          }
        }
      });
      uploader.upReady = 0;
      mainblock.on("change", ".editfile", function (e) {
        var
        that = $(this);
        if (!!filecheck && filecheck.indexOf(getFileType(this.files[0].name)) < 0) {
          __pageAlert.showTimerAlert("上传文件类型不匹配");
          return;
        }
        that.parent().next().addClass("prevedit");
        editfun(uploader, that.parent().attr("img-id"), this.files[0]);
        that.parent().remove();
        mainblock.find("input[type='hidden']").val(makeUploadUrls());
      }).on("click", ".delbtn", function (e) {
        e.stopPropagation();
        var
        that = $(this);
        that.parent().remove();
        mainblock.find("input[type='hidden']").val(makeUploadUrls());
        if (mainblock.find(".upimg").length < option.upnums) {
          mainblock.find(".adds").show();
        }
        if (mainblock.find(".upimg").length == 0) {
          mainblock.find(".default.message").show();
        }!!option.fileAddedCb && option.fileAddedCb("remove");
        return false;
      }).on("click", ".leftbtn", function (e) {
        let
        that = $(this),
        upload_key = that.parent().attr("upload-key");
        url_list = mainblock.find("input[type='hidden']").val().split(",");
        console.log("upload_key:", upload_key);
        console.log("url_list:", url_list);
        if (!!upload_key && !!url_list && url_list.length > 1) {
          let index = url_list.indexOf(upload_key);
          if (index <= 0) {
            __pageAlert.showTimerAlert("无效的排序");
          } else {
            let upload_divs = mainblock.find(".uploaditem:not([class*='adds'])");
            let now_div = upload_divs[index];
            let per_div = upload_divs[index - 1];
            $(per_div).before($(now_div).prop("outerHTML"));
            now_div.remove();
          }
        } else {
          __pageAlert.showTimerAlert("无效的排序");
        }
        //更新值顺序
        mainblock.find("input[type='hidden']").val(makeUploadUrls());
      });

      function showuploadFile(fileobj) {
        if (typeof FileReader === "undefined") {
          console.log("浏览器不支持本地预览");
          return;
        }
        // console.log(fileobj);
        var
        tmp = mainblock.find(".uploaditem.prevedit"),
        tmpl = upload_file_item_tmpl;
        if (option.uploadtype == "drop") {
          tmpl = upload_dropfile_item_tmpl;
        }
        if (tmp.length == 1) {
          tmp.before(tmpl.tempFormat(" upimg", fileobj.id, option.uploadtype == "drop" ? fileobj.name : getFileType(fileobj.name), "", getFileSize(fileobj.size), fileobj.name)).removeClass("prevedit");
        } else {
          mainblock.find(".uploaditem.adds").before(tmpl.tempFormat(" upimg", fileobj.id, option.uploadtype == "drop" ? fileobj.name : getFileType(fileobj.name), "", getFileSize(fileobj.size), fileobj.name));
        }
        if (mainblock.find(".upimg").length >= option.upnums) {
          mainblock.find(".adds").hide();
        }
        mainblock.find(".default.message").hide();
      }

      function showuploadimg(fileobj) {
        if (typeof FileReader === "undefined") {
          console.log("浏览器不支持本地预览");
          return;
        }
        // console.log(fileobj);
        var reader = new FileReader();
        reader.onload = function (e) {
          var
          tmp = mainblock.find(".uploaditem.prevedit"),
          tmpl = upload_img_item_tmpl;
          if (option.uploadtype == "drop") {
            tmpl = upload_drop_item_tmpl;
          }

          if (tmp.length == 1) {
            tmp.before(tmpl.tempFormat(" upimg", this.result, fileobj.id, "", getFileSize(fileobj.size), fileobj.name)).removeClass("prevedit");
          } else {
            mainblock.find(".uploaditem.adds").before(tmpl.tempFormat(" upimg", this.result, fileobj.id, "", getFileSize(fileobj.size), fileobj.name));
          }
          if (mainblock.find(".upimg").length >= option.upnums) {
            mainblock.find(".adds").hide();
          }
          mainblock.find(".default.message").hide();
        }
        reader.readAsDataURL(fileobj.getNative());
      }
      mainblock.find("input[type='hidden']").val(makeUploadUrls());

      return uploader;

      function editfun(uploaderobj, fileid, file) {
        if (!!fileid) {
          uploaderobj.removeFile(fileid);
        }
        uploaderobj.addFile(file);
      }

      function makeUploadUrls() {
        var
        urltxt = "",
        tmp = [];
        mainblock.find(".uploaditem").each(function () {
          var
          that = $(this),
          imgname = that.attr("upload-key");
          if (that.hasClass("adds")) {
            return;
          }
          if (imgname == "") {
            return;
          }
          tmp.push(imgname);
        });
        return tmp.join(",");
      }

      function getFileSize(num) {
        if (num < 1000) {
          return num + "B";
        } else if (num / 1000 < 1000) {
          num /= 1000;
          return Math.ceil(num) + "KB";
        } else if (num / 1000 < 1000) {
          num /= 1000;
          return Math.ceil(num) + "MB";
        }
      }
    },
    /**
     *
     * makeImgsHtml(['imgurl1', 'imgurl2'], '#upload_id');
     */
    makeImgsHtml: function(imgurls, filter) {
      var self = this;
      $(filter).children('div').prepend(getHtmlByDatas(imgurls, function(item){
        if(VIDEO_TYPE.indexOf(getFileType(item)) >= 0){
            return upload_file_item_tmpl.tempFormat(" editimg", item, getFileType(item), item);
        }else{
            return upload_img_item_tmpl.tempFormat(" editimg", item, "", item);
        }
      }));
      self.makeImgsEvent([$(filter)]);
    },
    makeImgsEvent: function(items) {
      $.each(items, function(idx, item){
        var
        maxnum = parseInt(item.attr("max-img"));
        if(item.find(".editimg").length >= maxnum){
          item.find(".uploaditem.adds").hide();
        }
      });
    }
  };

	var MAINEXPORTS = new qiniuUploader();
  return MAINEXPORTS;

  function getFileExt(str) {
    return d = /\.[^\.]+$/.exec(str);
  }

  function getFileType(str) {
    return getFileExt(str)[0].replace(".", "");
  }

  function getHtmlByDatas(datas, tmpmaker) {
    var tmp = "";
    for(var i in datas){
      var j = datas[i];
      tmp += tmpmaker(j, parseInt(i));
    }
    return tmp;
  }
});