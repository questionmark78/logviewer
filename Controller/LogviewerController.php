<?php

namespace Schuttelaar\LogviewerBundle\Controller;

use Pimcore\Bundle\AdminBundle\Controller\AdminController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;

class LogviewerController extends AdminController {
    
/**
     * /admin/logviewer/service/filelist
     *
     * @param Request $request
     *
     * @return JsonResponse
     */
    public function filelistAction(Request $request)
    {
        //$this->checkPermission('logviewer');

        $items = $this->getFilelist();
        return $this->json($items);
    }

    protected function getFilelist() {
  
        $files = scandir(PIMCORE_LOG_DIRECTORY);
        if(!is_array($files)) {
            $files = [];
        }
        $list = [];
        foreach($files as $file) {
            if($file == '.' || $file == '..') {
                continue;
            }
            if(substr($file, -4) == '.log' && is_file(PIMCORE_LOG_DIRECTORY.'/'.$file) && is_readable(PIMCORE_LOG_DIRECTORY.'/'.$file)) {
                $list[] = [
                            'status' => 'ok',
                            'message' => '',
                            'id' => $this->filename2id($file),
                            'text' => $file,
                            'filename' => $file,
                            'url' => '/admin/logviewer/service/tail',
                            'download' => '/admin/logviewer/service/download',
                            'timestamp' => date('c')
                        ];
            }
        }
        return $list;
    }

    /**
     * Convert filename to valid HTML ID.
    */
    public function filename2id($filename) {
        $filename = str_replace('.', '-', $filename);
        $chars = 'abcdefghijklmnopqrstuwvxyz01234567890-';
        $filename = trim(strtolower($filename));
        $out = '';
        for($i = 0; $i < strlen($filename); $i++) {
            if(strpos($chars, $filename[$i]) !== false) {
                $out .= $filename[$i];
            }
        }
        return $out;
    }

    /**
     * Flush the log file. Removes all lines.
     * Can be used to recover disk space and increase loading times of log file.
    */
    public function flushAction(Request $request) {
        $filename = $request->get('filename');

        $file = PIMCORE_LOG_DIRECTORY.'/'.$filename;

        if(is_file($file) && is_readable($file)) {

            $size = filesize($file);
            $f = @fopen($file, 'r+');
            if ($f !== false) {
                ftruncate($f, 0);
                fclose($f);
            }
            return $this->json(['status' => 'ok', 'message' => 'File '.$filename.' has been flushed. '.$size.' bytes of data deleted.']);
        }
        return $this->json(['status' => 'error', 'message' => 'Unable to flush '.$filename.'.']);
    }


    /**
     * Download the log file
    */
    public function downloadAction(Request $request) {
        $filename = $request->get('filename');

        $file = PIMCORE_LOG_DIRECTORY.'/'.$filename;

        if(is_file($file) && is_readable($file)) {
            $response = new BinaryFileResponse($file);
            $disposition = $response->headers->makeDisposition(ResponseHeaderBag::DISPOSITION_ATTACHMENT, $filename);
            $response->headers->set('Content-Disposition', $disposition);
        } else {
            return new Response('Error: Unable to read file '.$filename);
        }
        return $response;
    }

    public function tailAction(Request $request) {

        $filename = $request->get('filename');
        $lastFetchedSize = $request->get('size', 0);
        $keyword = $request->get('q');

        return $this->json($this->getNewLines($filename, $lastFetchedSize, $keyword));
    }


    /**
     * This function is in charge of retrieving the latest lines from the log file.
     * Inspired by https://github.com/taktos/php-tail/blob/master/PHPTail.php
     * @param string $lastFetchedSize The size of the file when we lasted tailed it.
     * @param string $grepKeyword The grep keyword. This will only return rows that contain this word
     * @return Returns the JSON representation of the latest file size and appended lines.
     */
    public function getNewLines($filename, $lastFetchedSize = 0, $grepKeyword = null, $invert = false) {

        $maxSizeToLoad = 100000;

        // Clear the stat cache to get the latest results
        clearstatcache();

        if(is_null($filename) || empty($filename)) {
            return [
                'status' => 'error',
                'message' => 'No filename specified.',
                'q' => $grepKeyword,
                'size' => 0,
                'file' => '',
                'lines' => '',
                'timestamp' => date('c')
            ];
        }

        $file = PIMCORE_LOG_DIRECTORY.'/'.$filename;
        if(!is_file($file) || !is_readable($file)) {
            return [
                'status' => 'error',
                'message' => 'Cannot read file.',
                'q' => $grepKeyword,
                'size' => 0,
                'file' => '',
                'lines' => '',
                'timestamp' => date('c')
            ];
        }

        $fsize = filesize($file);
        $maxLength = ($fsize - $lastFetchedSize);
        /**
         * Verify that we don't load more data then allowed.
         */
        if($maxLength > $maxSizeToLoad) {
            $maxLength = ($maxSizeToLoad / 2);
        }
        /**
         * Actually load the data
         */
        $data = array();
        if($maxLength > 0) {
            $fp = fopen($file, 'r');
            fseek($fp, -$maxLength, SEEK_END);
            $data = explode("\n", fread($fp, $maxLength));
        }
        /**
         * Run the grep function to return only the lines we're interested in.
         */
        if($invert == 0) {
            $data = preg_grep("/$grepKeyword/", $data);
        }
        else {
            $data = preg_grep("/$grepKeyword/", $data, PREG_GREP_INVERT);
        }
        /**
         * If the last entry in the array is an empty string lets remove it.
         */
        if(end($data) == "") {
            array_pop($data);
        }
        return [
            'status' => 'ok',
            'message' => '',
            'size' => $fsize,
            'id' => $this->filename2id($filename),
            'q' => $grepKeyword,
            'file' => $filename,
            'url' => '/admin/logviewer/service/tail',
            'download' => '/admin/logviewer/service/download',
            'lines' => $data,
            'timestamp' => date('c')
        ];
    }

    

}