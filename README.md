# Totally Getting Containers -- Workshop

### Intro

Kubernetes is a powerful suite of tools to orchestrate containerized apps. Let's dive in with a small starter project that will familiarize us with some important Kubernetes resources, and get a feel for what a typical workflow will be.

You will start with a small system made up of 3 components:

- an in-memory queue
- a publisher
- a subscriber

Following along with the instructions below, you will deploy all 3 of these components to a local Kubernetes cluster, and then can go further by implementing some stretch goals at the end of this document.

_NOTE: this workshop complements the presentations from the **LiveRamp Presents: Totally Getting Containers** meetup. Hopefully I will be able to post the recording of the talks as well, but for now, here are the slides:_
[Totally Getting Kubernetes](https://docs.google.com/presentation/d/1VCaTsz2MDKkRYleptdc___5pvSNB2dpQ53jtEsnwzfQ/edit?usp=sharing)
[Totally Getting Docker](https://docs.google.com/presentation/d/1HCZwYax7N6_Dso7f7v9soF-aLAo_lOMkmDerQ-hg7hM/edit?usp=sharing)

### Prerequisites

This workshop assumes minimal knowledge of Kubernetes. Even if you're brand new to Kube, some light googling throughout this project should be sufficient. The only 3 resources that we will encounter are [Pods](https://kubernetes.io/docs/concepts/workloads/pods/pod/), [Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/), and [Services](https://kubernetes.io/docs/concepts/services-networking/service/).

You should have a cluster running locally. [Docker for Mac](https://store.docker.com/editions/community/docker-ce-desktop-mac) is a good choice. After downloading it and enabling Kubernetes, run

```
$ kubectl version
```

to ensure setup is complete.

It's also recommended to have an easy way to send HTTP requests. This workshop assumes [HTTPie](https://httpie.org) throughout the examples, but something like [Postman](https://www.getpostman.com/) will work just as well.

_NOTE: HTTPie syntax allows for localhost shorthand: `http :3000` is equivalent to `http http://localhost:3000`. This workshop uses that shorthand syntax frequently!_

### Organization

This repo comes with some boilerplate code that comprises an un-containerized app. Each component is a small HTTP server written in Javascript. Feel free to translate this code into a language you are more familiar with, but note that you will only need to make very minimal changes to this code throughout the workshop.

Try to complete each step on your own, in order. There are git branches that you can check out to view solutions, in case you want to double check your work or if you get stuck.

### Workshop

#### 1. Running the app without kubernetes

You will see the 3 main directories: `publisher`, `queue`, and `subscriber`. Take some time to read through the servers found in the `main.js` files within each directory. When you are comfortable with the code, open a new terminal tab for each directory and run

```
$ node main.js
```

With the 3 servers running locally, `POST` a message to `http://localhost:3000`:

```
$ http POST :3000 name=Mac position='Sheriff of Paddys'
```

and then navigate to `http://localhost:3002` to read it, either from the command line or in the browser:

```
$ http :3002
HTTP/1.1 200 OK
Connection: keep-alive
Content-Length: 38
Date: Sun, 14 Oct 2018 23:12:23 GMT

{"name":"Mac","position":"Sheriff of Paddys"}
```

You can `POST` however many messages you want via the publisher, and then use the subscriber to read them LIFO style. For debugging purposes, you can also see the current contents of the queue at any time by navigating to `http://localhost:3001/queue`.

```
$ http :3001/queue
```

Once you feel comfortable with how the app works, proceed to step 2.

#### 2. Build docker images for each component

The first step to deploying an app to Kubernetes is to build it into an image for Kubernetes pods to run. We are going to create docker images for publisher, queue, and subscriber, by creating a Dockerfile for each app, and naming the images `workshop/publisher`, `workshop/queue`, and `workshop/subscriber`. Try this on your own, but for some more guidance, feel free to follow along with the steps below.
**Task**:

1. Create a file called `Dockerfile` at the root of each of the 3 components' directories.
2. In the Dockerfiles, use `node` as a base image, copy in the necessary files, run `npm install` when necessary, and have the container run the `main.js` file with node. You will use the directives: [FROM](https://docs.docker.com/engine/reference/builder/#from), [COPY](https://docs.docker.com/engine/reference/builder/#copy), [RUN](https://docs.docker.com/engine/reference/builder/#run), and [CMD](https://docs.docker.com/engine/reference/builder/#cmd). If you haven't written a Dockerfile before, then [this guide](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/) will be really helpful.
3. Use a `.dockerignore` file to ignore the node_modules/ directory. This keeps the build context small.
4. Build the images e.g:

```
$ docker build ./publisher -t workshop/publisher
```

_To see one possible solution, check out the branch **solution-images**_

```
$ git checkout solution-images
```

or view [this commit](https://github.com/cjea/tgc-workshop/commit/bd0911147eeaf5af1e9e60dc787cbf8564f81777)

#### 3. Our first Kubernetes errors

Let's try to run our publisher app in a Kubernetes pod by creating a deployment named `publisher`.

```
$ kubectl run publisher --image=workshop/publisher
deployment.apps "publisher" created
```

Seems like it worked! But let's check the pods . . .

```
$ kubectl get pod
NAME                         READY     STATUS         RESTARTS   AGE
publisher-5f577cbbdc-v9xxb   0/1       ErrImagePull   0          8s
```

The status of `ErrImagePull` indicates that something went wrong. To see the events leading up to the error, use the `describe` command:

```
$ kubectl describe pod <YOUR_POD_NAME>
```

At the bottom of the output, you will see a list of events. One will be something like `Failed to pull image "workshop/publisher": rpc error: code = Unknown desc = Error response from daemon: pull access denied for workshop/publisher, repository does not exist or may require 'docker login'`

Kubernetes thinks that we want to pull our `workshop/publisher` image from a remote image repository, like docker hub. We need to indicate to Kubernetes that we do not want it to try pulling this image.

```
$ kubectl run publisher --image=workshop/publisher --image-pull-policy=Never
Error from server (AlreadyExists): deployments.extensions "publisher" already exists
```

Here is our second error: kubectl will return an error when trying to create a resource that already exists. Let's fix this:

```
$ kubectl delete deployment publisher
deployment.extensions "publisher" deleted
$ kubectl run publisher --image=workshop/publisher --image-pull-policy=Never
deployment.apps "publisher" created
```

Verify that it all worked correctly:

```
$ kubectl get pod
NAME                         READY     STATUS    RESTARTS   AGE
publisher-668597fcc6-kw777   1/1       Running   0          1m
```

Success! Go ahead and run `kubectl delete pod <POD_NAME>`, and watch as the pod terminates while a new one immediately replaces it! Now that our deployment is in place, we can delete this pod over and over, and a new one (with a slightly different name) will constantly pop up to take its place. Feel the power!

Feel free to `describe` this pod as well and take a look at the Events. That's what a successful pod looks like. Also note: you'll be creating and deleting Kubernetes resources all the time. Nothing is sacred.

#### 4. Run the pods

Deploy the other components (queue, subscriber) to kubernetes the same way that we ran the publisher. After the deployments are created, check the statuses of the pods and make sure they are `Running`. If something goes wrong, like `CrashLoopBackOff`, it might be a problem with your Dockerfile. Make use of

```
$ kubectl logs <POD_NAME>
```

to get error messages from your container, and troubleshoot.

Again, you can list pods with

```
$ kubectl get pod
```

and pick any random pod from the list. Then run

```
$ kubectl delete pod <POD_NAME>
```

You'll see that the selected pod will terminate, but another one (with a slightly different name) will _immediately_ pop up to replace it. You can delete pods all day, and new ones will constantly spin up to replace them.

For fun, you can open two terminals, and in one, run `kubectl get pod -w` (-w for "watch"), and in another terminal, start deleting pods. You will see a feed in the first terminal of pods terminating, initializing, running, and so on.

#### 5. Exposing our services internally

At this point, all 3 of our components are running in Kubernetes. But we can't actually hit any of our services since none of the pods are exposed to the outside world. In fact, even if we could hit, say, our publisher service, it wouldn't do us any good. The `main.js` file in publisher will attempt to enqueue a message at `http://localhost:3001`, which works great when we run all of our services on our laptop, but breaks when run in isolated pods in a Kubernetes cluster (where each pod has its own separate notion of localhost).

If you are familiar with 12 factor app [philosophy](https://12factor.net), you'll know that it is best practice for an app to get its configuration from its environment. We no longer want our apps to hardcode `localhost` endpoints -- instead, we want to pass these endpoints as environment variables, so the code can remain more flexible and robust. Kubernetes makes this very easy for us.

1. Use the builtin `env` command to list the environment variables on the publisher pod:

```
$ kubectl exec <PUBLISHER_POD_NAME> env
```

2. Next, expose the queue deployment to the rest of the cluster. Kubernetes allows pods to communicate with each other via a `ClusterIP` service, which is a cluster-wide IP address that any pod can reach. There are multiple types of services (we'll see `NodePort` services in the next step), but the `kubectl expose` command defaults to creating a `ClusterIP` service.

```
$ kubectl expose deployment queue --port=3001
```

`kubectl get svc` will show that this new service has been created successfully.

3. Now, delete the current `publisher` pod so a new one spins up. When it is ready, check its environment variables. Do you notice the new values with which Kubernetes automatically populated the publisher's environment? Delete the `subscriber` pod and check its environment variables as well, to see that they get populated into each pod in the cluster. From now on, every pod in this cluster can expect to have these predictively formatted (if not a little verbose . . .) environment variables populated by Kubernetes.

4. Update the code in both publisher and subscriber to retrieve the queue's endpoint from the environment, as opposed to hardcoding it, using `QUEUE_SERVICE_HOST` and `QUEUE_SERVICE_PORT` variables. In javascript, you can access environment variables via `process.env`.

5. Build the docker images with the updated code, create the deployments (don't forget to delete the old ones first!), and ensure that all pods are running successfully.

_To see one possible solution, check out the branch **solution-internal-service**_

```
$ git checkout solution-internal-service
```

or view [this commit](https://github.com/cjea/tgc-workshop/commit/a53035be93594ce9fe6ad11d783d7ddc4c7d5147)

#### 5. Exposing our services externally

Now, our publisher and subscriber are able to discover the queue. But we still don't have a way of accessing publisher and subscriber themselves from outside of our cluster e.g. from our laptop's localhost. This will be necessary if we want to enqueue/dequeue messages without `exec`ing onto our pods each time.

To expose an app externally, we must create a NodePort service.

```
$ kubectl expose deployment publisher --type=NodePort --port=3000
```

This command causes Kubernetes to automatically allocate a random port on our machine, and then route all requests from that port on our laptop, to the `publisher`'s pods at the `--port` we provide.

```
$  kubectl get svc publisher
NAME         TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)          AGE
publisher    NodePort    10.103.107.240   <none>        3000:30233/TCP   2m
```

You will see that the publisher service automatically created a CLUSTER-IP, and that it connects ports `3000:30233`, the right hand number having been randomly assigned by Kubernetes. This means that all requests to our laptop's `http://localhost:30233` will now be routed to the publisher app's port 3000. Run the following command, substituting the randomly assigned port you see mapped in the publisher service.

```
$ http POST :30233 name=Charlie position=Janitor
```

and ensure that it is successful.

Now go ahead and expose the subscriber with a NodePort service as well. Attempt to read a message.

If you successfully retrieved a message from a queue, that means you've officially deployed a distributed system to Kubernetes. Congratulations!

### Stretch Goals

These stretch goals are just suggestions. If you think of anything cool to build out this system, feel free to jam on whatever interests you!

- Make each component of our app listen on port 3000, instead of 3001 and 3002. You will need to update the existing Kube services to map the correct ports. Note how Kubernetes/containers services make it so we don't have to worry about allocating different localhost ports for our apps anymore!

- Write a script called `bin/build-and-deploy` for each component that will build the docker image and deploy to our local kubernetes cluster. Make sure to put it in `.dockerignore`. Then write another that will build and deploy the entire 3-part system.

- Create a dedicated [Kubernetes namespace](https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/) for these apps, and move the deployments + services to that namespace

- Create a [Kubernetes secret](https://kubernetes.io/docs/concepts/configuration/secret/), and have the Queue verify that secret is present in every request before it alters the queue

- Make the queue a bit more persistent by flushing it to a mounted [Volume](https://kubernetes.io/docs/concepts/storage/volumes/).

- Use a real message queue (e.g RabbitMQ) instead of our in-memory queue.
- Anything else that catches your fancy!

### Hope you enjoyed!
