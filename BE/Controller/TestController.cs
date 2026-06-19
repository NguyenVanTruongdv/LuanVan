using Amazon;
using Amazon.Rekognition;
using Amazon.Rekognition.Model;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Transfer;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers
{
    [ApiController]
    [Route("api/test")]
    public class TestController : ControllerBase
    {
        private readonly IConfiguration _config;

        private readonly AmazonRekognitionClient _rekognitionClient;

        private readonly AmazonS3Client _s3Client;

        public TestController(IConfiguration config)
        {
            _config = config;

            var credentials = new BasicAWSCredentials(
                _config["AWS:AccessKey"],
                _config["AWS:SecretKey"]
            );

            _rekognitionClient = new AmazonRekognitionClient(
                credentials,
                RegionEndpoint.APSoutheast1
            );

            _s3Client = new AmazonS3Client(
                credentials,
                RegionEndpoint.APSoutheast1
            );
        }

        // =========================================
        // CREATE COLLECTION
        // =========================================

        [HttpPost("create-collection")]
        public async Task<IActionResult> CreateCollection()
        {
            var request = new CreateCollectionRequest
            {
                CollectionId = "gym-members"
            };

            var response =
                await _rekognitionClient.CreateCollectionAsync(request);

            return Ok(new
            {
                response.StatusCode,
                response.CollectionArn
            });
        }

        // =========================================
        // ADD MEMBER
        // Upload S3 + Index Face
        // =========================================

        [HttpPost("add-member")]
        public async Task<IActionResult> AddMember(
            IFormFile file,
            string memberId
        )
        {
            var bucketName = _config["AWS:BucketName"];

            // =========================
            // UPLOAD TO S3
            // =========================

            var fileName =
                $"{Guid.NewGuid()}_{file.FileName}";

            using var uploadStream = file.OpenReadStream();

            var uploadRequest = new TransferUtilityUploadRequest
            {
                InputStream = uploadStream,
                Key = fileName,
                BucketName = bucketName,
                ContentType = file.ContentType
            };

            var transferUtility =
                new TransferUtility(_s3Client);

            await transferUtility.UploadAsync(uploadRequest);

            var imageUrl =
                $"https://{bucketName}.s3.amazonaws.com/{fileName}";

            // =========================
            // INDEX FACE
            // =========================

            using var ms = new MemoryStream();
            await file.CopyToAsync(ms);

            var indexRequest = new IndexFacesRequest
            {
                CollectionId = "gym-members",

                Image = new Image
                {
                    Bytes = ms
                },

                ExternalImageId = memberId,

                DetectionAttributes = new List<string>()
            };

            var indexResponse =
                await _rekognitionClient.IndexFacesAsync(indexRequest);

            var faceId =
                indexResponse
                    .FaceRecords
                    .FirstOrDefault()
                    ?.Face
                    .FaceId;

            // =========================
            // RESPONSE
            // =========================

            return Ok(new
            {
                success = true,

                memberId,

                imageUrl,

                faceId
            });
        }

        // =========================================
        // SEARCH FACE
        // =========================================

        [HttpPost("search-face")]
        public async Task<IActionResult> SearchFace(
            IFormFile file
        )
        {
            using var ms = new MemoryStream();
            await file.CopyToAsync(ms);

            var request = new SearchFacesByImageRequest
            {
                CollectionId = "gym-members",

                Image = new Image
                {
                    Bytes = ms
                },

                FaceMatchThreshold = 90,

                MaxFaces = 1
            };

            var response =
                await _rekognitionClient.SearchFacesByImageAsync(request);

            var match =
                response.FaceMatches.FirstOrDefault();

            if (match == null)
            {
                return Ok(new
                {
                    matched = false
                });
            }

            return Ok(new
            {
                matched = true,

                similarity = match.Similarity,

                memberId = match.Face.ExternalImageId,

                faceId = match.Face.FaceId
            });
        }
    }
}