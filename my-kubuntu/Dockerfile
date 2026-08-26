# Start with the official Ubuntu base image
FROM ubuntu:latest

# Prevent interactive prompts from freezing the installation
ENV DEBIAN_FRONTEND=noninteractive

# Update the package list and install the Kubuntu desktop environment
RUN apt-get update && \
    apt-get install -y kubuntu-desktop && \
    apt-get clean

# Set the default command to open a terminal when the container starts
CMD ["/bin/bash"]
